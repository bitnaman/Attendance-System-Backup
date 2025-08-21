"""
Enhanced error handling utilities for the Dental Attendance System
"""
import logging
import traceback
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import sys

logger = logging.getLogger(__name__)

class AttendanceSystemError(Exception):
    """Base exception for the attendance system"""
    def __init__(self, message: str, error_code: str = "SYSTEM_ERROR", details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class FaceRecognitionError(AttendanceSystemError):
    """Face recognition related errors"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, "FACE_RECOGNITION_ERROR", details)

class DatabaseError(AttendanceSystemError):
    """Database operation errors"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, "DATABASE_ERROR", details)

class ValidationError(AttendanceSystemError):
    """Input validation errors"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, "VALIDATION_ERROR", details)

class FileProcessingError(AttendanceSystemError):
    """File processing errors"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, "FILE_PROCESSING_ERROR", details)

def create_error_response(
    error: Exception,
    status_code: int = 500,
    include_traceback: bool = False
) -> Dict[str, Any]:
    """Create a standardized error response"""
    
    if isinstance(error, AttendanceSystemError):
        response = {
            "error": True,
            "error_code": error.error_code,
            "message": error.message,
            "details": error.details
        }
        if isinstance(error, ValidationError):
            status_code = 400
        elif isinstance(error, FaceRecognitionError):
            status_code = 422
        elif isinstance(error, DatabaseError):
            status_code = 500
            
    elif isinstance(error, HTTPException):
        response = {
            "error": True,
            "error_code": "HTTP_ERROR",
            "message": error.detail,
            "details": {"status_code": error.status_code}
        }
        status_code = error.status_code
        
    else:
        # Generic error
        response = {
            "error": True,
            "error_code": "UNKNOWN_ERROR",
            "message": "An unexpected error occurred",
            "details": {"exception_type": type(error).__name__}
        }
    
    # Add traceback in debug mode
    if include_traceback:
        response["traceback"] = traceback.format_exc()
    
    # Log the error
    logger.error(f"Error occurred: {response['message']}", exc_info=True)
    
    return response

def safe_execute(func, error_message: str = "Operation failed", **kwargs):
    """Safely execute a function with error handling"""
    try:
        return func(**kwargs)
    except AttendanceSystemError:
        raise  # Re-raise custom errors
    except Exception as e:
        logger.error(f"Error in {func.__name__}: {e}", exc_info=True)
        raise AttendanceSystemError(f"{error_message}: {str(e)}")

async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for FastAPI"""
    error_response = create_error_response(exc, include_traceback=True)
    status_code = 500
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
    elif isinstance(exc, ValidationError):
        status_code = 400
    elif isinstance(exc, FaceRecognitionError):
        status_code = 422
        
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )

def handle_face_recognition_errors(func):
    """Decorator for face recognition error handling"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_msg = f"Face recognition failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise FaceRecognitionError(error_msg, {"original_error": str(e)})
    return wrapper

def validate_image_file(file, max_size: int = 10 * 1024 * 1024):
    """Validate uploaded image file"""
    if not file:
        raise ValidationError("No file provided")
    
    if not file.content_type.startswith('image/'):
        raise ValidationError(f"Invalid file type: {file.content_type}. Only image files are allowed.")
    
    # Check file size (if available)
    if hasattr(file, 'size') and file.size > max_size:
        raise ValidationError(f"File size too large. Maximum allowed: {max_size // (1024*1024)}MB")
    
    return True

def log_system_info():
    """Log system information for debugging"""
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Platform: {sys.platform}")
    
    # Log available packages
    try:
        import cv2
        logger.info(f"OpenCV version: {cv2.__version__}")
    except ImportError:
        logger.warning("OpenCV not available")
    
    try:
        import tensorflow as tf
        logger.info(f"TensorFlow version: {tf.__version__}")
    except ImportError:
        logger.warning("TensorFlow not available")
    
    try:
        import deepface
        logger.info("DeepFace available")
    except ImportError:
        logger.warning("DeepFace not available")
