"""
Configuration management API endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
import logging

from config import (
    MODEL_CONFIGS, DETECTOR_CONFIGS, AVAILABLE_DETECTORS, UNAVAILABLE_DETECTORS,
    FACE_RECOGNITION_MODEL, FACE_DETECTOR_BACKEND, FACE_DISTANCE_THRESHOLD
)

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
