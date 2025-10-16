#!/usr/bin/env python3
"""
Test script for face_recognition_logging module.
Verifies all logging functions work correctly without breaking anything.
"""

import sys
import os
import logging

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.face_recognition_logging import (
    log_model_configuration,
    log_tensorflow_setup,
    log_recognition_summary,
    log_face_match_decision,
    log_adaptive_threshold_strategy,
    log_multi_detector_cascade,
    log_face_quality_assessment,
    log_embedding_generation,
    format_student_list
)

# Create test logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('test_logging')

print("\n" + "="*70)
print(" TESTING FACE RECOGNITION LOGGING MODULE")
print("="*70)

try:
    print("\n📊 Test 1: Model Configuration Logging")
    print("-" * 70)
    log_model_configuration(
        logger=logger,
        model_name="ArcFace",
        detector_backend="retinaface",
        distance_threshold=16.0,
        threshold_source=".env (explicit: 16.0)",
        adaptive_enabled=True,
        min_confidence=0.10,
        enhanced_preprocessing=True,
        model_config={"threshold": 18.0, "embedding_size": 512},
        is_custom_threshold=True
    )
    print("✅ Test 1 PASSED\n")
    
    print("\n🔧 Test 2: TensorFlow Setup Logging")
    print("-" * 70)
    log_tensorflow_setup(
        logger=logger,
        tf_version="2.19.1",
        compute_mode="auto",
        gpu_available=True,
        gpu_count=1,
        gpu_names=["/physical_device:GPU:0"],
        gpu_test_result=6.0
    )
    print("✅ Test 2 PASSED\n")
    
    print("\n📊 Test 3: Recognition Summary Logging")
    print("-" * 70)
    identified_students = [
        {'name': 'Student 1', 'confidence': 0.85, 'face_quality': 0.72},
        {'name': 'Student 2', 'confidence': 0.78, 'face_quality': 0.65},
    ]
    log_recognition_summary(
        logger=logger,
        total_faces=5,
        identified_count=2,
        unidentified_count=3,
        recognition_time=2.5,
        total_time=3.2,
        adaptive_enabled=True,
        multi_detector_enabled=True,
        quality_filter_enabled=True,
        identified_students=identified_students
    )
    print("✅ Test 3 PASSED\n")
    
    print("\n✅ Test 4: Face Match Decision Logging (Accepted)")
    print("-" * 70)
    log_face_match_decision(
        logger=logger,
        face_number=1,
        match_accepted=True,
        student_name="John Doe",
        confidence=0.82,
        distance=15.3,
        face_quality=0.68,
        threshold=20.0,
        reason="clear match"
    )
    print("✅ Test 4 PASSED\n")
    
    print("\n❌ Test 5: Face Match Decision Logging (Rejected)")
    print("-" * 70)
    log_face_match_decision(
        logger=logger,
        face_number=2,
        match_accepted=False,
        reason="distance 25.5 > threshold 20.0"
    )
    print("✅ Test 5 PASSED\n")
    
    print("\n📊 Test 6: Adaptive Threshold Strategy")
    print("-" * 70)
    log_adaptive_threshold_strategy(logger, num_faces=1, adaptive_enabled=True)
    log_adaptive_threshold_strategy(logger, num_faces=5, adaptive_enabled=True)
    log_adaptive_threshold_strategy(logger, num_faces=15, adaptive_enabled=True)
    print("✅ Test 6 PASSED\n")
    
    print("\n🔍 Test 7: Multi-Detector Cascade Logging")
    print("-" * 70)
    log_multi_detector_cascade(
        logger=logger,
        detectors=['mtcnn', 'retinaface', 'mediapipe', 'opencv'],
        successful_detector='mtcnn',
        faces_found=3
    )
    print("✅ Test 7 PASSED\n")
    
    print("\n⭐ Test 8: Face Quality Assessment")
    print("-" * 70)
    log_face_quality_assessment(logger, face_number=1, quality_score=0.85, min_quality=0.3, rejected=False)
    log_face_quality_assessment(logger, face_number=2, quality_score=0.25, min_quality=0.3, rejected=True)
    log_face_quality_assessment(logger, face_number=3, quality_score=0.55, min_quality=0.3, enhanced=True)
    print("✅ Test 8 PASSED\n")
    
    print("\n✨ Test 9: Embedding Generation Logging")
    print("-" * 70)
    log_embedding_generation(
        logger=logger,
        student_name="Jane Smith",
        num_images=5,
        valid_images=4,
        num_embeddings_generated=3,
        outliers_removed=1,
        quality_weights=[0.35, 0.32, 0.33]
    )
    print("✅ Test 9 PASSED\n")
    
    print("\n📝 Test 10: Student List Formatting")
    print("-" * 70)
    students_short = [{'name': f'Student {i}'} for i in range(5)]
    students_long = [{'name': f'Student {i}'} for i in range(25)]
    
    formatted_short = format_student_list(students_short)
    formatted_long = format_student_list(students_long, max_display=10)
    
    print(f"Short list: {formatted_short}")
    print(f"Long list (truncated): {formatted_long}")
    print("✅ Test 10 PASSED\n")
    
    print("\n" + "="*70)
    print(" ✅ ALL TESTS PASSED - LOGGING MODULE WORKS CORRECTLY!")
    print("="*70)
    print("\n📋 Summary:")
    print("  ✓ Model configuration logging works")
    print("  ✓ TensorFlow setup logging works")
    print("  ✓ Recognition summary logging works")
    print("  ✓ Match decision logging works")
    print("  ✓ Adaptive threshold logging works")
    print("  ✓ Multi-detector logging works")
    print("  ✓ Quality assessment logging works")
    print("  ✓ Embedding generation logging works")
    print("  ✓ Student list formatting works")
    print("\n✨ The logging module is ready to use!")
    print("   You can gradually migrate face_recognition.py to use these functions.")
    print("="*70 + "\n")
    
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
