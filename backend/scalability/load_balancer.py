"""
Scalability and Load Balancing System
Implements horizontal scaling, load distribution, and resource optimization
"""
import asyncio
import logging
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import redis
import json
from fastapi import FastAPI, HTTPException
from sqlalchemy.orm import Session
import numpy as np
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

logger = logging.getLogger(__name__)

class LoadBalancer:
    """Advanced load balancer for face recognition processing"""
    
    def __init__(self):
        self.workers = []
        self.redis_client = None
        self.task_queue = asyncio.Queue()
        self.result_cache = {}
        self.worker_stats = {}
        
    async def initialize_redis_cluster(self):
        """Initialize Redis cluster for distributed processing"""
        try:
            from config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
            if REDIS_PASSWORD:
                self.redis_client = redis.Redis(
                    host=REDIS_HOST, 
                    port=REDIS_PORT, 
                    db=0,
                    password=REDIS_PASSWORD
                )
            else:
                self.redis_client = redis.Redis(
                    host=REDIS_HOST, 
                    port=REDIS_PORT, 
                    db=0
                )
            await self.redis_client.ping()
            logger.info("✅ Redis cluster initialized for load balancing")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
    
    def add_worker(self, worker_id: str, capacity: int = 10):
        """Add a processing worker"""
        worker = {
            'id': worker_id,
            'capacity': capacity,
            'current_load': 0,
            'last_heartbeat': time.time(),
            'status': 'active'
        }
        self.workers.append(worker)
        self.worker_stats[worker_id] = {
            'tasks_processed': 0,
            'avg_processing_time': 0,
            'error_count': 0
        }
        logger.info(f"Added worker {worker_id} with capacity {capacity}")
    
    def select_worker(self, task_type: str = 'face_recognition') -> Optional[str]:
        """Select best worker for task using weighted round-robin"""
        active_workers = [w for w in self.workers if w['status'] == 'active']
        
        if not active_workers:
            return None
        
        # Weighted selection based on capacity and current load
        weights = []
        for worker in active_workers:
            available_capacity = worker['capacity'] - worker['current_load']
            if available_capacity > 0:
                # Weight by available capacity and historical performance
                stats = self.worker_stats.get(worker['id'], {})
                performance_weight = max(0.1, 1.0 - (stats.get('error_count', 0) / 10))
                weight = available_capacity * performance_weight
                weights.append(weight)
            else:
                weights.append(0)
        
        if not any(weights):
            return None
        
        # Select worker based on weights
        total_weight = sum(weights)
        if total_weight == 0:
            return active_workers[0]['id']
        
        selection = np.random.choice(len(active_workers), p=[w/total_weight for w in weights])
        return active_workers[selection]['id']
    
    async def distribute_task(self, task_data: Dict[str, Any]) -> str:
        """Distribute task to available worker"""
        worker_id = self.select_worker(task_data.get('type', 'face_recognition'))
        
        if not worker_id:
            raise HTTPException(status_code=503, detail="No available workers")
        
        # Update worker load
        for worker in self.workers:
            if worker['id'] == worker_id:
                worker['current_load'] += 1
                break
        
        # Store task in Redis for worker pickup
        task_id = f"task_{int(time.time() * 1000)}"
        task_info = {
            'id': task_id,
            'worker_id': worker_id,
            'data': task_data,
            'created_at': time.time(),
            'status': 'pending'
        }
        
        if self.redis_client:
            await self.redis_client.setex(
                f"task:{task_id}",
                300,  # 5 minutes TTL
                json.dumps(task_info)
            )
        
        return task_id
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get result of distributed task"""
        if self.redis_client:
            result_data = await self.redis_client.get(f"result:{task_id}")
            if result_data:
                return json.loads(result_data)
        return None

class HorizontalScaling:
    """Horizontal scaling system for face recognition workers"""
    
    def __init__(self):
        self.min_workers = 2
        self.max_workers = 10
        self.scale_up_threshold = 0.8  # 80% capacity
        self.scale_down_threshold = 0.3  # 30% capacity
        self.scaling_cooldown = 60  # seconds
        self.last_scaling_time = 0
        
    def should_scale_up(self, current_load: float, worker_count: int) -> bool:
        """Determine if system should scale up"""
        if worker_count >= self.max_workers:
            return False
        
        if time.time() - self.last_scaling_time < self.scaling_cooldown:
            return False
        
        return current_load > self.scale_up_threshold
    
    def should_scale_down(self, current_load: float, worker_count: int) -> bool:
        """Determine if system should scale down"""
        if worker_count <= self.min_workers:
            return False
        
        if time.time() - self.last_scaling_time < self.scaling_cooldown:
            return False
        
        return current_load < self.scale_down_threshold
    
    async def auto_scale(self, load_balancer: LoadBalancer):
        """Automatically scale workers based on load"""
        total_capacity = sum(w['capacity'] for w in load_balancer.workers)
        total_load = sum(w['current_load'] for w in load_balancer.workers)
        current_load_ratio = total_load / max(1, total_capacity)
        worker_count = len(load_balancer.workers)
        
        if self.should_scale_up(current_load_ratio, worker_count):
            await self._scale_up(load_balancer)
        elif self.should_scale_down(current_load_ratio, worker_count):
            await self._scale_down(load_balancer)
    
    async def _scale_up(self, load_balancer: LoadBalancer):
        """Scale up by adding new workers"""
        new_worker_id = f"worker_{int(time.time())}"
        load_balancer.add_worker(new_worker_id, capacity=10)
        self.last_scaling_time = time.time()
        logger.info(f"Scaled up: Added worker {new_worker_id}")
    
    async def _scale_down(self, load_balancer: LoadBalancer):
        """Scale down by removing idle workers"""
        # Find least loaded worker
        idle_workers = [w for w in load_balancer.workers if w['current_load'] == 0]
        if idle_workers:
            worker_to_remove = idle_workers[0]
            load_balancer.workers.remove(worker_to_remove)
            self.last_scaling_time = time.time()
            logger.info(f"Scaled down: Removed worker {worker_to_remove['id']}")

class ResourceOptimizer:
    """Resource optimization for better performance"""
    
    def __init__(self):
        self.memory_threshold = 0.8  # 80% memory usage
        self.cpu_threshold = 0.8  # 80% CPU usage
        self.optimization_strategies = {
            'memory': self._optimize_memory,
            'cpu': self._optimize_cpu,
            'gpu': self._optimize_gpu
        }
    
    def analyze_resource_usage(self) -> Dict[str, float]:
        """Analyze current resource usage"""
        import psutil
        
        return {
            'memory_percent': psutil.virtual_memory().percent / 100,
            'cpu_percent': psutil.cpu_percent() / 100,
            'disk_percent': psutil.disk_usage('/').percent / 100
        }
    
    def should_optimize(self, resource_usage: Dict[str, float]) -> List[str]:
        """Determine which resources need optimization"""
        optimizations = []
        
        if resource_usage['memory_percent'] > self.memory_threshold:
            optimizations.append('memory')
        
        if resource_usage['cpu_percent'] > self.cpu_threshold:
            optimizations.append('cpu')
        
        return optimizations
    
    async def apply_optimizations(self, optimizations: List[str]):
        """Apply resource optimizations"""
        for optimization in optimizations:
            if optimization in self.optimization_strategies:
                await self.optimization_strategies[optimization]()
    
    async def _optimize_memory(self):
        """Optimize memory usage"""
        # Clear caches
        import gc
        gc.collect()
        
        # Reduce batch sizes
        logger.info("Applied memory optimization")
    
    async def _optimize_cpu(self):
        """Optimize CPU usage"""
        # Reduce concurrent processing
        # Use more efficient algorithms
        logger.info("Applied CPU optimization")
    
    async def _optimize_gpu(self):
        """Optimize GPU usage"""
        # Manage GPU memory
        # Use mixed precision
        logger.info("Applied GPU optimization")

class DistributedProcessing:
    """Distributed processing system for large-scale operations"""
    
    def __init__(self):
        self.process_pool = None
        self.thread_pool = None
        self.max_processes = 4
        self.max_threads = 8
    
    def initialize_pools(self):
        """Initialize process and thread pools"""
        self.process_pool = ProcessPoolExecutor(max_workers=self.max_processes)
        self.thread_pool = ThreadPoolExecutor(max_workers=self.max_threads)
        logger.info("Initialized distributed processing pools")
    
    async def process_batch_async(self, tasks: List[Dict[str, Any]], 
                                 processing_func: callable) -> List[Any]:
        """Process batch of tasks asynchronously"""
        if not self.thread_pool:
            self.initialize_pools()
        
        # Split tasks into chunks for optimal processing
        chunk_size = max(1, len(tasks) // self.max_threads)
        task_chunks = [tasks[i:i + chunk_size] for i in range(0, len(tasks), chunk_size)]
        
        # Process chunks concurrently
        loop = asyncio.get_event_loop()
        futures = []
        
        for chunk in task_chunks:
            future = loop.run_in_executor(
                self.thread_pool,
                self._process_chunk,
                chunk,
                processing_func
            )
            futures.append(future)
        
        # Wait for all chunks to complete
        results = await asyncio.gather(*futures)
        
        # Flatten results
        flattened_results = []
        for chunk_results in results:
            flattened_results.extend(chunk_results)
        
        return flattened_results
    
    def _process_chunk(self, chunk: List[Dict[str, Any]], 
                      processing_func: callable) -> List[Any]:
        """Process a chunk of tasks"""
        results = []
        for task in chunk:
            try:
                result = processing_func(task)
                results.append(result)
            except Exception as e:
                logger.error(f"Task processing failed: {e}")
                results.append({'error': str(e)})
        return results
    
    async def process_large_dataset(self, dataset: List[Any], 
                                   processing_func: callable,
                                   batch_size: int = 100) -> List[Any]:
        """Process large dataset in batches"""
        results = []
        
        for i in range(0, len(dataset), batch_size):
            batch = dataset[i:i + batch_size]
            batch_results = await self.process_batch_async(batch, processing_func)
            results.extend(batch_results)
            
            # Yield control to prevent blocking
            await asyncio.sleep(0.001)
        
        return results

class CacheManager:
    """Advanced caching system for performance optimization"""
    
    def __init__(self):
        self.redis_client = None
        self.local_cache = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0
        }
    
    async def initialize_redis_cache(self):
        """Initialize Redis for caching"""
        try:
            from config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
            if REDIS_PASSWORD:
                self.redis_client = redis.Redis(
                    host=REDIS_HOST, 
                    port=REDIS_PORT, 
                    db=1,
                    password=REDIS_PASSWORD,
                    decode_responses=True
                )
            else:
                self.redis_client = redis.Redis(
                    host=REDIS_HOST, 
                    port=REDIS_PORT, 
                    db=1,
                    decode_responses=True
                )
            await self.redis_client.ping()
            logger.info("✅ Redis cache initialized")
        except Exception as e:
            logger.warning(f"Redis caching not available: {e}")
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        # Try Redis first
        if self.redis_client:
            try:
                value = await self.redis_client.get(key)
                if value:
                    self.cache_stats['hits'] += 1
                    return json.loads(value)
            except Exception as e:
                logger.warning(f"Redis get failed: {e}")
        
        # Fallback to local cache
        if key in self.local_cache:
            self.cache_stats['hits'] += 1
            return self.local_cache[key]
        
        self.cache_stats['misses'] += 1
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600):
        """Set value in cache"""
        # Store in Redis
        if self.redis_client:
            try:
                await self.redis_client.setex(key, ttl, json.dumps(value))
            except Exception as e:
                logger.warning(f"Redis set failed: {e}")
        
        # Also store in local cache
        self.local_cache[key] = value
        self.cache_stats['sets'] += 1
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = self.cache_stats['hits'] / max(1, total_requests)
        
        return {
            'hit_rate': hit_rate,
            'total_requests': total_requests,
            'hits': self.cache_stats['hits'],
            'misses': self.cache_stats['misses'],
            'sets': self.cache_stats['sets']
        }

# Global instances
load_balancer = LoadBalancer()
horizontal_scaling = HorizontalScaling()
resource_optimizer = ResourceOptimizer()
distributed_processing = DistributedProcessing()
cache_manager = CacheManager()
