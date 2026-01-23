"""
Configuration management API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import logging

from config import (
    MODEL_CONFIGS, DETECTOR_CONFIGS, AVAILABLE_DETECTORS, UNAVAILABLE_DETECTORS,
    FACE_RECOGNITION_MODEL, FACE_DETECTOR_BACKEND, FACE_DISTANCE_THRESHOLD
)
from dependencies import get_db
from database import Student

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/config", tags=["Configuration"])


@router.get("/models", response_model=Dict[str, Any])
async def get_available_models():
    """Get all available face recognition models and their configurations"""
    try:
        return {
            "current_model": FACE_RECOGNITION_MODEL,
            "available_models": MODEL_CONFIGS,
            "description": "Face recognition models with their default thresholds and embedding dimensions"
        }
    except Exception as e:
        logger.error(f"Error fetching model configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/detectors", response_model=Dict[str, Any])
async def get_available_detectors():
    """Get all face detector backends and their availability status"""
    try:
        return {
            "current_detector": FACE_DETECTOR_BACKEND,
            "available_detectors": {
                name: DETECTOR_CONFIGS[name] for name in AVAILABLE_DETECTORS
            },
            "unavailable_detectors": {
                name: DETECTOR_CONFIGS[name] for name in UNAVAILABLE_DETECTORS
            },
            "description": "Face detector backends with their performance characteristics"
        }
    except Exception as e:
        logger.error(f"Error fetching detector configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/current", response_model=Dict[str, Any])
async def get_current_configuration():
    """Get current face recognition system configuration"""
    try:
        # Get model-specific threshold
        model_default_threshold = MODEL_CONFIGS.get(FACE_RECOGNITION_MODEL, {}).get("threshold", "Unknown")
        
        # Check if threshold is explicitly set in .env
        import os
        env_threshold_explicit = os.getenv("FACE_DISTANCE_THRESHOLD") is not None
        
        return {
            "model": {
                "name": FACE_RECOGNITION_MODEL,
                "config": MODEL_CONFIGS.get(FACE_RECOGNITION_MODEL, {}),
                "available": FACE_RECOGNITION_MODEL in MODEL_CONFIGS
            },
            "detector": {
                "name": FACE_DETECTOR_BACKEND,
                "config": DETECTOR_CONFIGS.get(FACE_DETECTOR_BACKEND, {}),
                "available": FACE_DETECTOR_BACKEND in AVAILABLE_DETECTORS
            },
            "threshold": {
                "current": FACE_DISTANCE_THRESHOLD,
                "model_default": model_default_threshold,
                "explicitly_set": env_threshold_explicit,
                "source": "explicit .env" if env_threshold_explicit else "model default"
            },
            "system_status": {
                "available_models": len(MODEL_CONFIGS),
                "available_detectors": len(AVAILABLE_DETECTORS),
                "unavailable_detectors": len(UNAVAILABLE_DETECTORS)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching current configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/requirements", response_model=Dict[str, Any])
async def get_detector_requirements():
    """Get installation requirements for all detector backends"""
    try:
        requirements = {}
        
        for detector_name, config in DETECTOR_CONFIGS.items():
            requirements[detector_name] = {
                "requirements": config.get("requirements", []),
                "available": detector_name in AVAILABLE_DETECTORS,
                "install_command": f"pip install {' '.join(config.get('requirements', []))}" if config.get('requirements') else "Already available"
            }
        
        return {
            "detector_requirements": requirements,
            "note": "Run the install_command to make unavailable detectors available",
            "restart_required": "Backend restart required after installing new detectors"
        }
    except Exception as e:
        logger.error(f"Error fetching detector requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compatibility", response_model=Dict[str, Any])
async def check_model_compatibility(db: Session = Depends(get_db)):
    """
    Check if current model/detector settings are compatible with registered students.
    
    IMPORTANT: Different face recognition models produce INCOMPATIBLE embeddings.
    If you change models, students registered with the old model won't be recognized!
    """
    try:
        # Get all students with their embedding model info
        students = db.query(Student).filter(Student.is_active == True).all()
        
        if not students:
            return {
                "compatible": True,
                "message": "No students registered yet",
                "current_model": FACE_RECOGNITION_MODEL,
                "current_detector": FACE_DETECTOR_BACKEND,
                "students_count": 0,
                "compatible_students": 0,
                "incompatible_students": 0,
                "issues": []
            }
        
        compatible_count = 0
        incompatible_count = 0
        unknown_count = 0
        issues = []
        
        for student in students:
            student_model = student.embedding_model
            
            if student_model is None:
                # Old student without model tracking
                unknown_count += 1
                issues.append({
                    "student_id": student.id,
                    "student_name": student.name,
                    "issue": "unknown_model",
                    "message": "Student was registered before model tracking. May need re-registration.",
                    "registered_model": None,
                    "current_model": FACE_RECOGNITION_MODEL
                })
            elif student_model != FACE_RECOGNITION_MODEL:
                # Model mismatch!
                incompatible_count += 1
                issues.append({
                    "student_id": student.id,
                    "student_name": student.name,
                    "issue": "model_mismatch",
                    "message": f"Registered with {student_model}, but current model is {FACE_RECOGNITION_MODEL}. Recognition will FAIL!",
                    "registered_model": student_model,
                    "current_model": FACE_RECOGNITION_MODEL
                })
            else:
                compatible_count += 1
        
        is_compatible = incompatible_count == 0
        
        # Generate warning message
        if incompatible_count > 0:
            warning = f"⚠️ CRITICAL: {incompatible_count} student(s) were registered with a different model and WILL NOT be recognized! Consider upgrading their embeddings or reverting to the original model."
        elif unknown_count > 0:
            warning = f"⚠️ WARNING: {unknown_count} student(s) have unknown model info. They may need to be re-registered if recognition fails."
        else:
            warning = None
        
        return {
            "compatible": is_compatible,
            "warning": warning,
            "current_model": FACE_RECOGNITION_MODEL,
            "current_detector": FACE_DETECTOR_BACKEND,
            "students_count": len(students),
            "compatible_students": compatible_count,
            "incompatible_students": incompatible_count,
            "unknown_model_students": unknown_count,
            "issues": issues[:20],  # Limit to first 20 issues
            "recommendation": (
                "All students are compatible with current model." if is_compatible and unknown_count == 0
                else "Consider upgrading embeddings for incompatible students using 'Upgrade AI' feature."
            )
        }
    except Exception as e:
        logger.error(f"Error checking model compatibility: {e}")
        raise HTTPException(status_code=500, detail=str(e))
