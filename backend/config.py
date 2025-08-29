"""
Configuration for the Dental Attendance System
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).parent
ROOT_DIR = BASE_DIR.parent
STATIC_DIR = BASE_DIR / "static"

# Database settings
# Replace these with your actual PostgreSQL credentials
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "dental_attendance")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "root")

# PostgreSQL connection URL
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

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
FACE_RECOGNITION_MODEL = "Facenet512"
FACE_DETECTOR_BACKEND = "mtcnn"
FACE_DISTANCE_THRESHOLD = 0.5  # Lower is more strict
FACE_CONFIDENCE_THRESHOLD = 0.65  # For older HOG-based system

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
