"""
Configuration for the Dental Attendance System
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Base directories
BASE_DIR = Path(__file__).parent  # backend/
ROOT_DIR = BASE_DIR.parent         # project root

# Load environment variables from ROOT .env file (single source of truth)
# This ensures the same .env is used regardless of working directory
env_path = ROOT_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
    print(f"✅ Loaded config from: {env_path}")
else:
    print(f"⚠️ WARNING: .env file not found at {env_path}")
    load_dotenv()  # Fallback to default behavior

STATIC_DIR = BASE_DIR / "static"

# ===== DATABASE CONFIGURATION =====
# Supports both PostgreSQL and SQLite via DATABASE_TYPE env variable
DATABASE_TYPE = os.getenv("DATABASE_TYPE", "sqlite").lower()  # "postgresql" or "sqlite"

if DATABASE_TYPE == "postgresql":
    # PostgreSQL Configuration
    from urllib.parse import quote_plus
    
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "dental_attendance")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "dental_user")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
    
    # URL-encode special characters in username and password
    encoded_user = quote_plus(POSTGRES_USER)
    encoded_password = quote_plus(POSTGRES_PASSWORD)
    
    DATABASE_URL = f"postgresql://{encoded_user}:{encoded_password}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    DB_ENGINE_ARGS = {}  # PostgreSQL doesn't need special args
else:
    # SQLite Configuration (default)
    DB_FILE = os.getenv("DB_FILE", "attendance.db")
    
    # Ensure DB_FILE is an absolute path
    if not os.path.isabs(DB_FILE):
        DB_FILE = str(BASE_DIR / DB_FILE)
    
    DATABASE_URL = f"sqlite:///{DB_FILE}"
    DB_ENGINE_ARGS = {"check_same_thread": False}  # SQLite-specific: allow multiple threads

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_CACHE_EXPIRATION_SECONDS = int(os.getenv("REDIS_CACHE_EXPIRATION_SECONDS", "300"))

# Redis connection URL
if REDIS_PASSWORD:
    REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
else:
    REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

# Photo Storage Configuration
PHOTO_STORAGE_TYPE = os.getenv("PHOTO_STORAGE_TYPE", "local").lower()  # "local" or "s3"

# AWS S3 Configuration (used when PHOTO_STORAGE_TYPE = "s3")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Static file paths (for local storage)
STUDENT_PHOTOS_DIR = STATIC_DIR / "student_photos"
ATTENDANCE_PHOTOS_DIR = STATIC_DIR / "attendance_photos"
DATASET_DIR = STATIC_DIR / "dataset"
EXPORTS_DIR = STATIC_DIR / "exports"

# Photo URL base configuration
if PHOTO_STORAGE_TYPE == "s3":
    PHOTO_BASE_URL = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com"
else:
    PHOTO_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")

# Face recognition settings
FACE_RECOGNITION_MODEL = os.getenv("FACE_RECOGNITION_MODEL", "ArcFace")  # Upgraded to ArcFace
FACE_DETECTOR_BACKEND = os.getenv("FACE_DETECTOR_BACKEND", "mtcnn")
FACE_DISTANCE_THRESHOLD = float(os.getenv("FACE_DISTANCE_THRESHOLD", "18.0"))  # Adjusted for ArcFace
FACE_CONFIDENCE_THRESHOLD = 0.65  # For older HOG-based system

# Adaptive threshold configuration
ADAPTIVE_THRESHOLD_MODE = os.getenv("ADAPTIVE_THRESHOLD_MODE", "disabled").lower()
if ADAPTIVE_THRESHOLD_MODE not in ["enabled", "disabled"]:
    ADAPTIVE_THRESHOLD_MODE = "disabled"  # Fallback to disabled if invalid

# ===== CORE RECOGNITION SETTINGS (Controllable via .env) =====
# Minimum confidence to consider a match (0.0 to 1.0)
MIN_CONFIDENCE_THRESHOLD = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.35"))

# Minimum face size in pixels (faces smaller than this are rejected)
MIN_FACE_SIZE = int(os.getenv("MIN_FACE_SIZE", "30"))

# Enable enhanced image preprocessing (histogram eq, sharpening, denoising)
ENHANCED_PREPROCESSING = os.getenv("ENHANCED_PREPROCESSING", "true").lower() == "true"

# Enable multi-detector cascade (fallback through multiple detectors)
ENABLE_MULTI_DETECTOR = os.getenv("ENABLE_MULTI_DETECTOR", "true").lower() == "true"

# Enable face quality assessment (filters low-quality faces)
ENABLE_QUALITY_ASSESSMENT = os.getenv("ENABLE_QUALITY_ASSESSMENT", "true").lower() == "true"

# Adaptive threshold adjustments for group photos
THRESHOLD_SMALL_GROUP_OFFSET = float(os.getenv("THRESHOLD_SMALL_GROUP_OFFSET", "4.0"))  # Added for 3-10 faces
THRESHOLD_LARGE_GROUP_OFFSET = float(os.getenv("THRESHOLD_LARGE_GROUP_OFFSET", "8.0"))  # Added for 11+ faces

# Ambiguity detection margin (rejects if best/second-best are too close)
AMBIGUITY_MARGIN = float(os.getenv("AMBIGUITY_MARGIN", "3.0"))

# Model performance configurations
MODEL_CONFIGS = {
    "Facenet512": {"threshold": 20.0, "embedding_size": 512},
    "ArcFace": {"threshold": 18.0, "embedding_size": 512},
    "Facenet": {"threshold": 15.0, "embedding_size": 128},
    "GhostFaceNet": {"threshold": 19.0, "embedding_size": 512},
    "SFace": {"threshold": 12.0, "embedding_size": 128}
}

# ===== ACCURACY IMPROVEMENT SETTINGS =====

# Ensemble recognition
ENABLE_ENSEMBLE_RECOGNITION = os.getenv("ENABLE_ENSEMBLE_RECOGNITION", "false").lower() == "true"
ENSEMBLE_MODELS_STRING = os.getenv("ENSEMBLE_MODELS", "ArcFace:0.45,Facenet512:0.35,SFace:0.20")

# Parse ensemble models configuration
ENSEMBLE_MODELS_CONFIG = {}
if ENABLE_ENSEMBLE_RECOGNITION and ENSEMBLE_MODELS_STRING:
    for model_config in ENSEMBLE_MODELS_STRING.split(','):
        if ':' in model_config:
            model_name, weight = model_config.strip().split(':')
            model_name = model_name.strip()
            if model_name in MODEL_CONFIGS:
                ENSEMBLE_MODELS_CONFIG[model_name] = {
                    'weight': float(weight),
                    'threshold': MODEL_CONFIGS[model_name]['threshold']
                }

# Advanced preprocessing
ENABLE_FACE_ALIGNMENT = os.getenv("ENABLE_FACE_ALIGNMENT", "true").lower() == "true"
ENABLE_ILLUMINATION_NORMALIZATION = os.getenv("ENABLE_ILLUMINATION_NORMALIZATION", "true").lower() == "true"
ENABLE_SHARPNESS_ENHANCEMENT = os.getenv("ENABLE_SHARPNESS_ENHANCEMENT", "true").lower() == "true"
ENABLE_NOISE_REDUCTION = os.getenv("ENABLE_NOISE_REDUCTION", "true").lower() == "true"
ENABLE_SUPER_RESOLUTION = os.getenv("ENABLE_SUPER_RESOLUTION", "true").lower() == "true"

# Quality filtering
ENABLE_QUALITY_FILTERING = os.getenv("ENABLE_QUALITY_FILTERING", "true").lower() == "true"
MIN_FACE_QUALITY_SCORE = float(os.getenv("MIN_FACE_QUALITY_SCORE", "0.4"))
MIN_SHARPNESS_THRESHOLD = float(os.getenv("MIN_SHARPNESS_THRESHOLD", "50.0"))
REJECT_BLURRY_FACES = os.getenv("REJECT_BLURRY_FACES", "true").lower() == "true"
REJECT_OCCLUDED_FACES = os.getenv("REJECT_OCCLUDED_FACES", "true").lower() == "true"

# Data augmentation
ENABLE_DATA_AUGMENTATION = os.getenv("ENABLE_DATA_AUGMENTATION", "true").lower() == "true"
AUGMENTATION_VARIATIONS = int(os.getenv("AUGMENTATION_VARIATIONS", "5"))

# Confidence thresholds
MIN_RECOGNITION_CONFIDENCE = float(os.getenv("MIN_RECOGNITION_CONFIDENCE", "0.50"))
HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.80"))

# Advanced detection
ENABLE_MULTI_DETECTOR_FALLBACK = os.getenv("ENABLE_MULTI_DETECTOR_FALLBACK", "true").lower() == "true"
DETECTOR_FALLBACK_SEQUENCE = os.getenv("DETECTOR_FALLBACK_SEQUENCE", "mtcnn,retinaface,mediapipe,opencv").split(',')

# Logging
LOG_QUALITY_METRICS = os.getenv("LOG_QUALITY_METRICS", "true").lower() == "true"
LOG_ENSEMBLE_DECISIONS = os.getenv("LOG_ENSEMBLE_DECISIONS", "true").lower() == "true"
SAVE_PROBLEMATIC_FACES = os.getenv("SAVE_PROBLEMATIC_FACES", "false").lower() == "true"

# Face detector backends configuration
DETECTOR_CONFIGS = {
    "opencv": {
        "description": "OpenCV Haar Cascade - Fast but basic",
        "performance": "Fast",
        "accuracy": "Basic",
        "requirements": ["opencv-python"]
    },
    "mtcnn": {
        "description": "Multi-task CNN - Very accurate",
        "performance": "Moderate", 
        "accuracy": "High",
        "requirements": ["mtcnn", "tensorflow"]
    },
    "ssd": {
        "description": "Single Shot Detector - Balanced",
        "performance": "Fast",
        "accuracy": "Good", 
        "requirements": ["tensorflow"]
    },
    "retinaface": {
        "description": "RetinaFace - Highly accurate for difficult conditions",
        "performance": "Slow",
        "accuracy": "Very High",
        "requirements": ["retina-face", "tensorflow"]
    },
    "dlib": {
        "description": "Dlib HOG + Linear SVM - Traditional approach",
        "performance": "Moderate",
        "accuracy": "Good",
        "requirements": ["dlib"]
    },
    "mediapipe": {
        "description": "MediaPipe Face Detection - Google's solution",
        "performance": "Fast",
        "accuracy": "Good",
        "requirements": ["mediapipe"]
    }
}

# Check detector availability
def check_detector_availability():
    """Check which detector backends are available"""
    available_detectors = []
    unavailable_detectors = []
    
    for detector_name in DETECTOR_CONFIGS.keys():
        try:
            if detector_name == 'opencv':
                import cv2
                available_detectors.append(detector_name)
            elif detector_name == 'mtcnn':
                import mtcnn
                available_detectors.append(detector_name)
            elif detector_name == 'ssd':
                import tensorflow
                available_detectors.append(detector_name)
            elif detector_name == 'retinaface':
                from retinaface import RetinaFace  # Updated import
                available_detectors.append(detector_name)
            elif detector_name == 'dlib':
                import dlib
                available_detectors.append(detector_name)
            elif detector_name == 'mediapipe':
                import mediapipe
                available_detectors.append(detector_name)
        except ImportError:
            unavailable_detectors.append(detector_name)
    
    return available_detectors, unavailable_detectors

# Get available detectors
AVAILABLE_DETECTORS, UNAVAILABLE_DETECTORS = check_detector_availability()

# Validate selected detector
if FACE_DETECTOR_BACKEND not in AVAILABLE_DETECTORS:
    print(f"⚠️ WARNING: Selected detector '{FACE_DETECTOR_BACKEND}' is not available!")
    print(f"Available detectors: {', '.join(AVAILABLE_DETECTORS)}")
    if AVAILABLE_DETECTORS:
        # Fall back to first available detector
        fallback_detector = AVAILABLE_DETECTORS[0]
        print(f"🔄 Falling back to '{fallback_detector}'")
        FACE_DETECTOR_BACKEND = fallback_detector
    else:
        raise RuntimeError("No face detector backends are available!")

# Server settings
HOST = "0.0.0.0"
PORT = 8000
DEBUG = True

# Logging settings
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = ROOT_DIR / "dental_attendance.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Configurable logging throttle interval in milliseconds
# Controls the minimum time between similar log messages
# This value is read directly from the .env file
_throttle_ms = os.getenv("LOG_THROTTLE_MS")
if _throttle_ms is None:
    raise ValueError("LOG_THROTTLE_MS must be set in the .env file")
LOG_THROTTLE_MS = int(_throttle_ms)

# CORS settings
CORS_ORIGINS = ["*"]  # In production, specify actual origins

# File upload settings
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Create directories if they don't exist
def ensure_directories():
    """Create necessary directories"""
    directories = [
        STATIC_DIR,
        STUDENT_PHOTOS_DIR,
        ATTENDANCE_PHOTOS_DIR,
        DATASET_DIR,
        EXPORTS_DIR
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

if __name__ == "__main__":
    ensure_directories()
    print("Directories created successfully!")
    print(f"Database URL: {DATABASE_URL}")
