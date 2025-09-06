"""
Configurable time-based logging middleware with throttling support.
"""
import logging
import time
import traceback
import os
from typing import Callable, Dict, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ThrottledLogger:
    """Logger with configurable time-based throttling."""
    
    def __init__(self, logger_instance: logging.Logger, throttle_ms: int = 1000):
        self.logger = logger_instance
        self.throttle_interval = throttle_ms / 1000.0  # Convert ms to seconds
        self.last_log_times: Dict[str, float] = {}
        self.message_counts: Dict[str, int] = {}
    
    def _should_log(self, message_key: str) -> bool:
        """Check if enough time has passed to log this type of message."""
        current_time = time.time()
        last_time = self.last_log_times.get(message_key, 0)
        
        if current_time - last_time >= self.throttle_interval:
            self.last_log_times[message_key] = current_time
            return True
        
        # Count suppressed messages
        self.message_counts[message_key] = self.message_counts.get(message_key, 0) + 1
        return False
    
    def _log_suppressed_count(self, message_key: str):
        """Log how many messages were suppressed."""
        count = self.message_counts.get(message_key, 0)
        if count > 0:
            self.logger.info(f"🔇 [{message_key}] Suppressed {count} similar log entries")
            self.message_counts[message_key] = 0
    
    def throttled_info(self, message: str, category: str = "general"):
        """Log info message with throttling based on category."""
        if self._should_log(category):
            self._log_suppressed_count(category)
            self.logger.info(message)
    
    def throttled_debug(self, message: str, category: str = "general"):
        """Log debug message with throttling based on category."""
        if self._should_log(f"debug_{category}"):
            self._log_suppressed_count(f"debug_{category}")
            self.logger.debug(message)
    
    def throttled_warning(self, message: str, category: str = "general"):
        """Log warning message with throttling based on category."""
        if self._should_log(f"warning_{category}"):
            self._log_suppressed_count(f"warning_{category}")
            self.logger.warning(message)
    
    def throttled_error(self, message: str, category: str = "general"):
        """Log error message with throttling based on category."""
        if self._should_log(f"error_{category}"):
            self._log_suppressed_count(f"error_{category}")
            self.logger.error(message)
    
    # Always log certain critical messages without throttling
    def info(self, message: str):
        """Log info message without throttling."""
        self.logger.info(message)
    
    def error(self, message: str, exc_info: bool = False):
        """Log error message without throttling."""
        self.logger.error(message, exc_info=exc_info)
    
    def warning(self, message: str):
        """Log warning message without throttling."""
        self.logger.warning(message)
    
    def debug(self, message: str):
        """Log debug message without throttling."""
        self.logger.debug(message)


class ConfigurableLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests with configurable throttling."""
    
    def __init__(self, app, logger_name: str = __name__, log_interval_ms: int = 1000):
        super().__init__(app)
        base_logger = logging.getLogger(logger_name)
        self.throttled_logger = ThrottledLogger(base_logger, log_interval_ms)
        self.log_interval_ms = log_interval_ms
    
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details with configurable throttling."""
        start_time = time.time()
        
        # Throttled logging for requests based on endpoint type
        endpoint_category = self._get_endpoint_category(request.url.path)
        
        # Only log incoming requests for important endpoints or with throttling
        if endpoint_category == "critical" or request.method != "GET":
            # Critical endpoints always logged
            self.throttled_logger.info(
                f"🔵 {request.method} {request.url.path} - "
                f"Client: {request.client.host if request.client else 'unknown'}"
            )
        else:
            # Other endpoints use throttled logging
            self.throttled_logger.throttled_info(
                f"🔵 {request.method} {request.url.path} - "
                f"Client: {request.client.host if request.client else 'unknown'}",
                category=f"request_{endpoint_category}"
            )
        
        # Log request body for non-GET requests (but not files)
        if request.method != "GET":
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith("multipart/form-data"):
                try:
                    body = await request.body()
                    if body and len(body) < 1000:  # Only log small bodies
                        self.throttled_logger.throttled_debug(
                            f"Request body: {body.decode('utf-8', errors='ignore')}", 
                            category="request_body"
                        )
                except Exception:
                    pass
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Throttled logging for responses
            if endpoint_category == "critical" or response.status_code >= 400:
                # Always log critical endpoints or errors
                status_emoji = self._get_status_emoji(response.status_code)
                self.throttled_logger.info(
                    f"{status_emoji} {request.method} {request.url.path} - "
                    f"Status: {response.status_code} - "
                    f"Time: {process_time:.3f}s"
                )
            else:
                # Use throttled logging for routine responses
                status_emoji = self._get_status_emoji(response.status_code)
                self.throttled_logger.throttled_info(
                    f"{status_emoji} {request.method} {request.url.path} - "
                    f"Status: {response.status_code} - "
                    f"Time: {process_time:.3f}s",
                    category=f"response_{endpoint_category}"
                )
            
            # Add processing time header
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Calculate processing time for errors
            process_time = time.time() - start_time
            
            # Always log exceptions without throttling
            self.throttled_logger.error(
                f"❌ {request.method} {request.url.path} - "
                f"Error: {str(e)} - "
                f"Time: {process_time:.3f}s",
                exc_info=True
            )
            
            # Log detailed traceback for debugging
            self.throttled_logger.debug(f"Exception traceback:\n{traceback.format_exc()}")
            
            # Return error response
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "error_type": type(e).__name__,
                    "timestamp": time.time()
                },
                headers={"X-Process-Time": str(process_time)}
            )
    
    def _get_endpoint_category(self, path: str) -> str:
        """Categorize endpoints for different logging strategies."""
        if path in ["/health", "/", "/docs", "/openapi.json"]:
            return "routine"
        elif path.startswith("/attendance/mark") or path.startswith("/student/"):
            return "critical"
        elif path.startswith("/attendance/") or path.startswith("/static/"):
            return "standard"
        else:
            return "other"
    
    def _get_status_emoji(self, status_code: int) -> str:
        """Get emoji based on HTTP status code."""
        if 200 <= status_code < 300:
            return "✅"
        elif 300 <= status_code < 400:
            return "🔄"
        elif 400 <= status_code < 500:
            return "⚠️"
        else:
            return "❌"


def setup_logging(log_interval_ms: int = 1000):
    """Configure logging for the application with configurable throttling.
    
    Args:
        log_interval_ms: Minimum milliseconds between similar log messages (default: 1000ms)
    """
    
    # Create logs directory relative to the backend directory
    import os
    logs_dir = "logs"
    os.makedirs(logs_dir, exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(os.path.join(logs_dir, "app.log")),
            logging.StreamHandler()
        ]
    )
    
    # Configure specific loggers to reduce noise
    loggers_config = {
        "uvicorn.access": logging.WARNING,  # Reduce uvicorn access logs since we have our own
        "uvicorn.error": logging.INFO,
        "sqlalchemy.engine": logging.WARNING,  # Reduce SQL logs unless debugging
        "botocore": logging.WARNING,  # Reduce AWS SDK logs
        "boto3": logging.WARNING,
        "PIL": logging.WARNING,  # Reduce image processing logs
        "deepface": logging.INFO,
        "tensorflow": logging.WARNING,  # Reduce TensorFlow logs
        "watchfiles.main": logging.WARNING,  # Significantly reduce file watcher logs
        "watchfiles": logging.WARNING,
        "multipart": logging.WARNING,  # Reduce multipart form logs
        "httpx": logging.WARNING,  # Reduce HTTP client logs
        "httpcore": logging.WARNING,
    }
    
    for logger_name, level in loggers_config.items():
        logging.getLogger(logger_name).setLevel(level)
    
    logger.info(f"✅ Logging configuration completed (throttle interval: {log_interval_ms}ms)")


# Create a global throttled logger instance
def create_throttled_logger(name: str, throttle_ms: int = 1000) -> ThrottledLogger:
    """Create a throttled logger instance.
    
    Args:
        name: Logger name
        throttle_ms: Minimum milliseconds between similar log messages
    
    Returns:
        ThrottledLogger instance
    """
    base_logger = logging.getLogger(name)
    return ThrottledLogger(base_logger, throttle_ms)
    
    # Create logs directory
    import os
    logs_dir = "logs"
    os.makedirs(logs_dir, exist_ok=True)
    
    logger.info("✅ Logging configuration completed")


def log_startup_info():
    """Log application startup information."""
    import sys
    import platform
    from config import (
        PHOTO_STORAGE_TYPE, DATABASE_URL, FACE_RECOGNITION_MODEL, 
        FACE_DETECTOR_BACKEND, FACE_DISTANCE_THRESHOLD, MODEL_CONFIGS,
        LOG_THROTTLE_MS, PORT, HOST
    )
    
    logger.info("🚀 Starting BTech Attendance System")
    logger.info("=" * 60)
    
    # System Information
    logger.info("📊 SYSTEM CONFIGURATION")
    logger.info(f"🐍 Python version: {sys.version}")
    logger.info(f"💻 Platform: {platform.platform()}")
    logger.info(f"🌐 Server: {HOST}:{PORT}")
    logger.info(f"📝 Log throttle: {LOG_THROTTLE_MS}ms")
    
    # Database Information
    logger.info("🗃️ DATABASE CONFIGURATION")
    logger.info(f"� Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Not configured'}")
    
    # Storage Information
    logger.info("📁 STORAGE CONFIGURATION")
    logger.info(f"💾 Storage type: {PHOTO_STORAGE_TYPE}")
    if PHOTO_STORAGE_TYPE == "s3":
        from config import S3_BUCKET_NAME, AWS_REGION
        logger.info(f"☁️ S3 Bucket: {S3_BUCKET_NAME} in {AWS_REGION}")
    else:
        logger.info("🏠 Using local file storage")
    
    # Face Recognition Configuration
    logger.info("🤖 FACE RECOGNITION CONFIGURATION")
    logger.info(f"🧠 Model: {FACE_RECOGNITION_MODEL}")
    logger.info(f"👁️ Detector: {FACE_DETECTOR_BACKEND}")
    
    # Check if threshold is explicitly set in .env
    import os
    env_threshold_set = os.getenv("FACE_DISTANCE_THRESHOLD") is not None
    
    if env_threshold_set:
        logger.info(f"📏 .env Threshold: {FACE_DISTANCE_THRESHOLD} (explicit)")
    else:
        logger.info(f"📏 .env Threshold: {FACE_DISTANCE_THRESHOLD} (using config default)")
    
    # Model-specific configuration
    if FACE_RECOGNITION_MODEL in MODEL_CONFIGS:
        model_config = MODEL_CONFIGS[FACE_RECOGNITION_MODEL]
        logger.info(f"⚙️ Model Default - Threshold: {model_config['threshold']}, Embedding Size: {model_config['embedding_size']}")
        
        # Show effective threshold logic
        if env_threshold_set:
            logger.info(f"🔄 Effective Threshold: {FACE_DISTANCE_THRESHOLD} (using explicit .env value)")
        else:
            logger.info(f"✅ Effective Threshold: {model_config['threshold']} (using model default)")
    else:
        if env_threshold_set:
            logger.info(f"⚠️ No specific config found for {FACE_RECOGNITION_MODEL}, using explicit .env threshold: {FACE_DISTANCE_THRESHOLD}")
        else:
            logger.info(f"⚠️ No specific config found for {FACE_RECOGNITION_MODEL}, using fallback threshold: {FACE_DISTANCE_THRESHOLD}")
    
    # Available models
    logger.info("📋 Available Models:")
    for model_name, config in MODEL_CONFIGS.items():
        status = "🟢 ACTIVE" if model_name == FACE_RECOGNITION_MODEL else "⚪"
        logger.info(f"   {status} {model_name}: threshold={config['threshold']}, embedding={config['embedding_size']}d")
    
    # Detector configuration
    from config import DETECTOR_CONFIGS, AVAILABLE_DETECTORS, UNAVAILABLE_DETECTORS
    logger.info("🔍 DETECTOR CONFIGURATION")
    if FACE_DETECTOR_BACKEND in DETECTOR_CONFIGS:
        detector_config = DETECTOR_CONFIGS[FACE_DETECTOR_BACKEND]
        logger.info(f"🎯 Active Detector: {FACE_DETECTOR_BACKEND}")
        logger.info(f"   📝 {detector_config['description']}")
        logger.info(f"   ⚡ Performance: {detector_config['performance']}")
        logger.info(f"   🎯 Accuracy: {detector_config['accuracy']}")
    
    # Available detectors
    logger.info("📋 Available Detectors:")
    for detector_name in AVAILABLE_DETECTORS:
        config = DETECTOR_CONFIGS.get(detector_name, {})
        status = "🟢 ACTIVE" if detector_name == FACE_DETECTOR_BACKEND else "✅"
        logger.info(f"   {status} {detector_name}: {config.get('performance', 'Unknown')} performance, {config.get('accuracy', 'Unknown')} accuracy")
    
    if UNAVAILABLE_DETECTORS:
        logger.info("❌ Unavailable Detectors:")
        for detector_name in UNAVAILABLE_DETECTORS:
            config = DETECTOR_CONFIGS.get(detector_name, {})
            requirements = ", ".join(config.get('requirements', ['Unknown']))
            logger.info(f"   ⚪ {detector_name}: requires {requirements}")
    
    # Configuration change instructions
    logger.info("🔧 CONFIGURATION CHANGE GUIDE:")
    logger.info("   📝 To change model: Update FACE_RECOGNITION_MODEL in .env file")
    logger.info("   👁️ To change detector: Update FACE_DETECTOR_BACKEND in .env file")  
    logger.info("   📏 To change threshold: Update FACE_DISTANCE_THRESHOLD in .env file")
    logger.info("   🔄 To apply changes: Restart backend server")
    
    logger.info("=" * 60)


def log_shutdown_info():
    """Log application shutdown information."""
    logger.info("🛑 Shutting down BTech Attendance System")
    logger.info("👋 Goodbye!")
