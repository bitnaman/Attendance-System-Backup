"""
Quick Integration Example: Using Accuracy Improvements
Shows how to integrate the new accuracy features into your existing system
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

# Example 1: Basic preprocessing integration
def example_preprocessing():
    """Example: Preprocess face before recognition"""
    from ai.accuracy_improvements import preprocess_face_advanced
    import cv2
    
    # Load face image
    face_image = cv2.imread("path/to/face.jpg")
    
    # Preprocess (this improves quality automatically)
    enhanced_face = preprocess_face_advanced(face_image)
    
    # Now use enhanced_face for recognition
    # ... your existing recognition code ...
    
    print("✅ Face preprocessed and enhanced")


# Example 2: Quality filtering integration
def example_quality_filtering():
    """Example: Check face quality before processing"""
    from ai.accuracy_improvements import assess_face_quality
    import cv2
    
    # Load face image
    face_image = cv2.imread("path/to/face.jpg")
    
    # Assess quality
    quality = assess_face_quality(face_image)
    
    print(f"Quality Score: {quality.overall_quality:.3f}")
    print(f"Sharpness: {quality.sharpness:.1f}")
    print(f"Is Acceptable: {quality.is_acceptable}")
    
    if quality.is_acceptable:
        # Process this face
        print("✅ Face quality is good, proceeding with recognition")
    else:
        # Reject or ask for better photo
        print("⚠️ Face quality is poor, requesting better photo")
        if quality.sharpness < 50:
            print("   Issue: Blurry image")
        if quality.occlusion_score < 0.5:
            print("   Issue: Face appears occluded")


# Example 3: Ensemble recognition integration
def example_ensemble_recognition():
    """Example: Use ensemble system for higher accuracy"""
    from ai.accuracy_improvements import EnsembleRecognitionSystem
    import numpy as np
    import cv2
    
    # Initialize ensemble (uses ArcFace + Facenet512 + SFace)
    ensemble = EnsembleRecognitionSystem()
    
    # Prepare known students data
    known_embeddings = {
        123: {  # Student ID
            'ArcFace': np.array([...]),  # Embedding from ArcFace
            'Facenet512': np.array([...]),  # Embedding from Facenet512
            'SFace': np.array([...])  # Embedding from SFace
        },
        # Add more students...
    }
    
    # Recognize face
    face_image = cv2.imread("path/to/face.jpg")
    result = ensemble.recognize_with_ensemble(
        face_image=face_image,
        known_embeddings_dict=known_embeddings,
        min_confidence=0.5
    )
    
    if result.student_id:
        print(f"✅ Recognized: Student {result.student_id}")
        print(f"   Confidence: {result.confidence:.3f}")
        print(f"   Quality: {result.quality_metrics.overall_quality:.3f}")
        print(f"   Time: {result.processing_time:.2f}s")
    else:
        print("❌ No match found")


# Example 4: Data augmentation during registration
def example_data_augmentation():
    """Example: Generate augmented samples during student registration"""
    from ai.accuracy_improvements import DataAugmentationEngine
    from deepface import DeepFace
    import cv2
    
    # Initialize augmentation engine
    augmenter = DataAugmentationEngine()
    
    # Load student photo
    original_photo = cv2.imread("student_photo.jpg")
    
    # Generate 5 augmented variations
    augmented_photos = augmenter.augment_face_for_registration(
        original_photo,
        num_variations=5
    )
    
    print(f"✅ Generated {len(augmented_photos)} training samples")
    
    # Generate embeddings for all variations
    embeddings = []
    for i, photo in enumerate(augmented_photos):
        embedding = DeepFace.represent(
            img_path=photo,
            model_name='ArcFace',
            enforce_detection=False
        )[0]["embedding"]
        embeddings.append(embedding)
        print(f"   Sample {i+1}: Embedding generated")
    
    # Average the embeddings for more robust representation
    avg_embedding = np.mean(embeddings, axis=0)
    
    return avg_embedding


# Example 5: Complete workflow with all features
def example_complete_workflow():
    """Example: Complete workflow from photo to recognition"""
    from ai.accuracy_improvements import (
        AdvancedFacePreprocessor,
        FaceQualityAssessor,
        EnsembleRecognitionSystem
    )
    import cv2
    
    # Initialize components
    preprocessor = AdvancedFacePreprocessor()
    quality_assessor = FaceQualityAssessor()
    
    # Load attendance photo
    attendance_photo = cv2.imread("classroom_photo.jpg")
    
    # Detect faces (use your existing face detection)
    detected_faces = detect_faces_in_photo(attendance_photo)
    
    recognized_students = []
    
    for face_region in detected_faces:
        # Step 1: Extract face
        face_image = extract_face(attendance_photo, face_region)
        
        # Step 2: Assess quality
        quality = quality_assessor.assess_quality(face_image)
        
        if not quality.is_acceptable:
            print(f"⚠️ Skipping low quality face (score: {quality.overall_quality:.3f})")
            continue
        
        # Step 3: Preprocess
        enhanced_face = preprocessor.preprocess_face(
            face_image,
            enable_alignment=True,
            enable_illumination=True,
            enable_sharpening=True
        )
        
        # Step 4: Recognize (your existing recognition or ensemble)
        student_id = recognize_face(enhanced_face)
        
        if student_id:
            recognized_students.append({
                'student_id': student_id,
                'quality': quality.overall_quality,
                'location': face_region
            })
    
    print(f"\n✅ Recognized {len(recognized_students)} students")
    for student in recognized_students:
        print(f"   Student {student['student_id']} (quality: {student['quality']:.3f})")
    
    return recognized_students


# Placeholder functions (replace with your actual implementation)
def detect_faces_in_photo(photo):
    """Your existing face detection"""
    return []

def extract_face(photo, region):
    """Your existing face extraction"""
    return photo

def recognize_face(face_image):
    """Your existing recognition"""
    return None


if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════════╗
║         ACCURACY IMPROVEMENTS - INTEGRATION EXAMPLES           ║
╚════════════════════════════════════════════════════════════════╝

This file shows how to use the new accuracy features:

1. example_preprocessing()
   - Basic preprocessing for better image quality

2. example_quality_filtering()
   - Filter out poor quality faces

3. example_ensemble_recognition()
   - Use multiple models for higher accuracy

4. example_data_augmentation()
   - Generate more training samples

5. example_complete_workflow()
   - Full workflow with all features

To use:
  - Review each example
  - Integrate relevant parts into your code
  - Adjust parameters based on your needs
  - Test with your data

For detailed configuration, see: ACCURACY_IMPROVEMENT_GUIDE.md
    """)
