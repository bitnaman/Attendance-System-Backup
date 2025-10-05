"""
Advanced Error Handling and Robustness Features
Implements circuit breakers, retry mechanisms, and graceful degradation
"""
import asyncio
import logging
import time
from typing import Any, Callable, Optional, Dict, List
from functools import wraps
from enum import Enum
import psutil
import redis
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
import numpy as np

logger = logging.getLogger(__name__)

class SystemStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    OFFLINE = "offline"

class CircuitBreaker:
    """Circuit breaker pattern for external service calls"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            
            raise e

class RetryMechanism:
    """Advanced retry mechanism with exponential backoff"""
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    async def retry_async(self, func: Callable, *args, **kwargs) -> Any:
        """Retry async function with exponential backoff"""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.max_retries + 1} attempts failed")
        
        raise last_exception
    
    def retry_sync(self, func: Callable, *args, **kwargs) -> Any:
        """Retry sync function with exponential backoff"""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {e}")
                    time.sleep(delay)
                else:
                    logger.error(f"All {self.max_retries + 1} attempts failed")
        
        raise last_exception

class GracefulDegradation:
    """Graceful degradation system for maintaining service availability"""
    
    def __init__(self):
        self.degradation_levels = {
            'full': {'face_recognition': True, 'gpu_acceleration': True, 'ensemble': True},
            'reduced': {'face_recognition': True, 'gpu_acceleration': False, 'ensemble': False},
            'minimal': {'face_recognition': False, 'gpu_acceleration': False, 'ensemble': False}
        }
        self.current_level = 'full'
        self.system_metrics = {}
    
    def assess_system_health(self) -> SystemStatus:
        """Assess overall system health"""
        try:
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Check memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Check disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Determine system status
            if cpu_percent > 90 or memory_percent > 90 or disk_percent > 95:
                return SystemStatus.CRITICAL
            elif cpu_percent > 70 or memory_percent > 80 or disk_percent > 85:
                return SystemStatus.DEGRADED
            else:
                return SystemStatus.HEALTHY
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return SystemStatus.CRITICAL
    
    def adjust_degradation_level(self, status: SystemStatus):
        """Adjust system degradation level based on health status"""
        if status == SystemStatus.CRITICAL:
            self.current_level = 'minimal'
        elif status == SystemStatus.DEGRADED:
            self.current_level = 'reduced'
        else:
            self.current_level = 'full'
        
        logger.info(f"System degradation level set to: {self.current_level}")
    
    def get_feature_availability(self) -> Dict[str, bool]:
        """Get current feature availability based on degradation level"""
        return self.degradation_levels[self.current_level]

class DatabaseResilience:
    """Database connection resilience and recovery"""
    
    def __init__(self):
        self.connection_pool_size = 10
        self.connection_timeout = 30
        self.retry_attempts = 3
    
    async def execute_with_resilience(self, db_session, operation: Callable, *args, **kwargs):
        """Execute database operation with resilience"""
        retry_mechanism = RetryMechanism(max_retries=self.retry_attempts)
        
        async def db_operation():
            try:
                result = operation(db_session, *args, **kwargs)
                if hasattr(result, 'commit'):
                    result.commit()
                return result
            except SQLAlchemyError as e:
                logger.error(f"Database error: {e}")
                db_session.rollback()
                raise HTTPException(status_code=500, detail="Database operation failed")
        
        return await retry_mechanism.retry_async(db_operation)
    
    def check_connection_health(self, db_session) -> bool:
        """Check database connection health"""
        try:
            db_session.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return False

class FaceRecognitionResilience:
    """Face recognition system resilience"""
    
    def __init__(self):
        self.fallback_models = ['Facenet', 'Facenet512', 'ArcFace']
        self.current_model_index = 0
        self.model_failures = {}
    
    def get_working_model(self) -> str:
        """Get a working face recognition model"""
        for model in self.fallback_models:
            if model not in self.model_failures or \
               time.time() - self.model_failures[model] > 300:  # 5 minutes
                return model
        
        # If all models failed, return the first one and let it fail gracefully
        return self.fallback_models[0]
    
    def record_model_failure(self, model: str):
        """Record model failure for fallback logic"""
        self.model_failures[model] = time.time()
        logger.warning(f"Model {model} failed, will try alternatives")
    
    async def robust_face_detection(self, image_path: str, 
                                  face_recognizer) -> Dict[str, Any]:
        """Robust face detection with fallback mechanisms"""
        retry_mechanism = RetryMechanism(max_retries=2)
        
        async def detect_faces():
            try:
                # Try primary detection method
                faces = face_recognizer.detect_faces(image_path)
                return {'faces': faces, 'method': 'primary'}
            except Exception as e:
                logger.warning(f"Primary detection failed: {e}")
                
                # Try fallback detection methods
                for detector in ['opencv', 'mtcnn', 'ssd']:
                    try:
                        faces = face_recognizer.detect_faces_with_detector(image_path, detector)
                        return {'faces': faces, 'method': f'fallback_{detector}'}
                    except Exception as fallback_e:
                        logger.warning(f"Fallback detector {detector} failed: {fallback_e}")
                        continue
                
                # If all methods fail, return empty result
                return {'faces': [], 'method': 'failed', 'error': str(e)}
        
        return await retry_mechanism.retry_async(detect_faces)

class SystemMonitoring:
    """Advanced system monitoring and alerting"""
    
    def __init__(self):
        self.metrics_history = []
        self.alert_thresholds = {
            'cpu_percent': 80,
            'memory_percent': 85,
            'disk_percent': 90,
            'response_time': 5.0
        }
        self.alerts_sent = set()
    
    def collect_metrics(self) -> Dict[str, Any]:
        """Collect system metrics"""
        try:
            metrics = {
                'timestamp': time.time(),
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
                'process_count': len(psutil.pids()),
                'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            }
            
            self.metrics_history.append(metrics)
            
            # Keep only last 1000 metrics
            if len(self.metrics_history) > 1000:
                self.metrics_history = self.metrics_history[-1000:]
            
            return metrics
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
            return {}
    
    def check_alerts(self, metrics: Dict[str, Any]) -> List[str]:
        """Check for alert conditions"""
        alerts = []
        
        for metric, threshold in self.alert_thresholds.items():
            if metric in metrics and metrics[metric] > threshold:
                alert_key = f"{metric}_{int(metrics['timestamp'])}"
                if alert_key not in self.alerts_sent:
                    alerts.append(f"High {metric}: {metrics[metric]}% (threshold: {threshold}%)")
                    self.alerts_sent.add(alert_key)
        
        return alerts
    
    def get_system_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive system health summary"""
        if not self.metrics_history:
            return {'status': 'no_data'}
        
        recent_metrics = self.metrics_history[-10:]  # Last 10 measurements
        
        avg_cpu = np.mean([m['cpu_percent'] for m in recent_metrics])
        avg_memory = np.mean([m['memory_percent'] for m in recent_metrics])
        avg_disk = np.mean([m['disk_percent'] for m in recent_metrics])
        
        # Determine overall health
        if avg_cpu > 80 or avg_memory > 85 or avg_disk > 90:
            health_status = 'critical'
        elif avg_cpu > 60 or avg_memory > 70 or avg_disk > 80:
            health_status = 'degraded'
        else:
            health_status = 'healthy'
        
        return {
            'status': health_status,
            'metrics': {
                'avg_cpu_percent': round(avg_cpu, 2),
                'avg_memory_percent': round(avg_memory, 2),
                'avg_disk_percent': round(avg_disk, 2)
            },
            'alerts': self.check_alerts(recent_metrics[-1] if recent_metrics else {})
        }

# Global instances
circuit_breaker = CircuitBreaker()
retry_mechanism = RetryMechanism()
graceful_degradation = GracefulDegradation()
database_resilience = DatabaseResilience()
face_recognition_resilience = FaceRecognitionResilience()
system_monitoring = SystemMonitoring()

# Decorator for automatic error handling
def resilient_operation(func):
    """Decorator for automatic resilience in operations"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Operation {func.__name__} failed: {e}")
            
            # Try graceful degradation
            if hasattr(graceful_degradation, 'get_feature_availability'):
                features = graceful_degradation.get_feature_availability()
                if not features.get('face_recognition', True):
                    return {'error': 'Face recognition temporarily unavailable', 'degraded': True}
            
            raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")
    
    return wrapper
