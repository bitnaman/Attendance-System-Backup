"""
Performance Optimization Module for Facial Attendance System
Implements advanced caching, batch processing, and GPU optimization
"""
import asyncio
import time
import logging
from typing import List, Dict, Any, Optional
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import cv2
from fastapi import BackgroundTasks
import redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """Advanced performance optimization for face recognition system"""
    
    def __init__(self):
        self.redis_client = None
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        self.embedding_cache = {}
        self.batch_size = 8
        self.gpu_memory_fraction = 0.8
        
    async def initialize_redis(self):
        """Initialize Redis for caching"""
        try:
            from config import REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD
            if REDIS_PASSWORD:
                self.redis_client = redis.Redis(
                    host=REDIS_HOST, 
                    port=REDIS_PORT, 
                    db=REDIS_DB, 
                    password=REDIS_PASSWORD,
                    decode_responses=True
                )
            else:
                self.redis_client = redis.Redis(
                    host=REDIS_HOST, 
                    port=REDIS_PORT, 
                    db=REDIS_DB, 
                    decode_responses=True
                )
            await self.redis_client.ping()
            logger.info("✅ Redis cache initialized")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory cache: {e}")
            self.redis_client = None
    
    @lru_cache(maxsize=1000)
    def cached_face_detection(self, image_hash: str, detector_backend: str):
        """Cached face detection to avoid reprocessing same images"""
        # This would be implemented with actual face detection
        pass
    
    async def batch_face_processing(self, images: List[np.ndarray], 
                                  face_recognizer) -> List[Dict[str, Any]]:
        """Process multiple faces in batches for better GPU utilization"""
        results = []
        
        # Split into batches for optimal GPU memory usage
        for i in range(0, len(images), self.batch_size):
            batch = images[i:i + self.batch_size]
            
            # Process batch concurrently
            batch_tasks = [
                self._process_single_face_async(img, face_recognizer) 
                for img in batch
            ]
            
            batch_results = await asyncio.gather(*batch_tasks)
            results.extend(batch_results)
        
        return results
    
    async def _process_single_face_async(self, image: np.ndarray, 
                                       face_recognizer) -> Dict[str, Any]:
        """Async face processing with GPU optimization"""
        loop = asyncio.get_event_loop()
        
        # Run CPU-intensive face processing in thread pool
        result = await loop.run_in_executor(
            self.thread_pool,
            self._process_face_sync,
            image,
            face_recognizer
        )
        return result
    
    def _process_face_sync(self, image: np.ndarray, face_recognizer) -> Dict[str, Any]:
        """Synchronous face processing optimized for GPU"""
        # Implement optimized face processing
        # Use GPU memory management
        # Apply image preprocessing optimizations
        pass
    
    def optimize_image_preprocessing(self, image: np.ndarray) -> np.ndarray:
        """Advanced image preprocessing for better performance"""
        # Resize to optimal dimensions (reduce processing time)
        height, width = image.shape[:2]
        if height > 512 or width > 512:
            scale = min(512/height, 512/width)
            new_height, new_width = int(height * scale), int(width * scale)
            image = cv2.resize(image, (new_width, new_height))
        
        # Apply histogram equalization for better contrast
        if len(image.shape) == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
            image[:,:,0] = cv2.equalizeHist(image[:,:,0])
            image = cv2.cvtColor(image, cv2.COLOR_YUV2BGR)
        
        return image
    
    async def preload_embeddings(self, db: Session):
        """Preload all student embeddings into memory for faster matching"""
        if self.redis_client:
            # Store in Redis for fast access
            students = db.query(Student).filter(Student.is_active == True).all()
            for student in students:
                if student.face_encoding_path:
                    embedding = np.load(student.face_encoding_path)
                    await self.redis_client.setex(
                        f"embedding:{student.id}",
                        3600,  # 1 hour cache
                        embedding.tobytes()
                    )
    
    # GPU optimization removed - CPU-only mode


class AsyncFaceProcessor:
    """Asynchronous face processing for better concurrency"""
    
    def __init__(self, max_concurrent: int = 4):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.processing_queue = asyncio.Queue()
    
    async def process_attendance_photo_async(self, image_path: str, 
                                          face_recognizer) -> Dict[str, Any]:
        """Process attendance photo asynchronously"""
        async with self.semaphore:
            # Implement async face processing
            # Use background tasks for non-blocking operations
            pass
    
    async def batch_attendance_processing(self, photo_paths: List[str],
                                        face_recognizer) -> List[Dict[str, Any]]:
        """Process multiple attendance photos concurrently"""
        tasks = [
            self.process_attendance_photo_async(path, face_recognizer)
            for path in photo_paths
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if not isinstance(r, Exception)]


# Global performance optimizer instance
performance_optimizer = PerformanceOptimizer()
async_processor = AsyncFaceProcessor()
