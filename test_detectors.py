#!/usr/bin/env python3
"""
Test script to check available DeepFace detector backends
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def check_detector_availability():
    """Check which detector backends are available"""
    detectors = {
        'opencv': 'cv2',
        'mtcnn': 'mtcnn',
        'retinaface': 'retina_face', 
        'ssd': 'tensorflow',
        'dlib': 'dlib',
        'mediapipe': 'mediapipe'
    }
    
    available_detectors = []
    unavailable_detectors = []
    
    for detector_name, module_name in detectors.items():
        try:
            if module_name == 'cv2':
                import cv2
                available_detectors.append(detector_name)
            elif module_name == 'mtcnn':
                import mtcnn
                available_detectors.append(detector_name)
            elif module_name == 'retina_face':
                import retina_face
                available_detectors.append(detector_name)
            elif module_name == 'tensorflow':
                import tensorflow
                available_detectors.append(detector_name)
            elif module_name == 'dlib':
                import dlib
                available_detectors.append(detector_name)
            elif module_name == 'mediapipe':
                import mediapipe
                available_detectors.append(detector_name)
        except ImportError:
            unavailable_detectors.append(detector_name)
    
    print("=== DETECTOR AVAILABILITY CHECK ===")
    print(f"✅ Available detectors: {', '.join(available_detectors)}")
    print(f"❌ Unavailable detectors: {', '.join(unavailable_detectors)}")
    
    return available_detectors, unavailable_detectors

if __name__ == "__main__":
    check_detector_availability()
