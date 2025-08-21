"""
Configuration for the Dental Attendance System
"""
import os
from pathlib import Path

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
POSTGRES_PASSWORD = "root"  # Update this!

# PostgreSQL connection URL
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Static file paths
STUDENT_PHOTOS_DIR = STATIC_DIR / "student_photos"
ATTENDANCE_PHOTOS_DIR = STATIC_DIR / "attendance_photos"
DATASET_DIR = STATIC_DIR / "dataset"
EXPORTS_DIR = STATIC_DIR / "exports"

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
LOG_LEVEL = "INFO"
LOG_FILE = ROOT_DIR / "dental_attendance.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

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
