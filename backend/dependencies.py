"""
Dependencies for the Dental Attendance System with Class-Based Support.
"""

import logging
from typing import Generator
from functools import lru_cache
from sqlalchemy.orm import Session

# Import database components
from database import SessionLocal, engine
from face_recognition import ClassBasedFaceRecognizer

logger = logging.getLogger(__name__)

# Global face recognizer instance
_face_recognizer: ClassBasedFaceRecognizer = None


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session (supports PostgreSQL and SQLite).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@lru_cache()
def initialize_face_recognizer() -> ClassBasedFaceRecognizer:
    """
    Initialize the face recognizer with class-based filtering support.
    """
    global _face_recognizer
    if _face_recognizer is None:
        logger.info("Initializing face recognizer...")
        _face_recognizer = ClassBasedFaceRecognizer()
        logger.info("Face recognizer initialized successfully!")
    return _face_recognizer


def get_face_recognizer() -> ClassBasedFaceRecognizer:
    """
    Dependency to get the face recognizer instance.
    """
    if _face_recognizer is None:
        initialize_face_recognizer()
    return _face_recognizer


def get_db_connection():
    """
    Get raw database connection for advanced operations.
    """
    return engine.connect()
