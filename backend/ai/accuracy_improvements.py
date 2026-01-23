"""
Advanced Accuracy Improvement System for Face Recognition
Implements ensemble methods, quality assessment, and preprocessing techniques
"""
import os
os.environ.setdefault("KERAS_BACKEND", "tensorflow")
os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")

import cv2
import numpy as np
import logging
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from deepface import DeepFace
import tensorflow as tf

# Force CPU mode
tf.config.set_visible_devices([], 'GPU')
tf.get_logger().setLevel('ERROR')

logger = logging.getLogger(__name__)


@dataclass
class FaceQualityMetrics:
    """Comprehensive face quality assessment"""
    sharpness: float
    brightness: float
    contrast: float
    size_score: float
    pose_score: float
    occlusion_score: float
    overall_quality: float
    is_acceptable: bool


@dataclass
class RecognitionResult:
    """Enhanced recognition result with confidence and quality info"""
    student_id: Optional[int]
    confidence: float
    distance: float
    quality_metrics: Optional[FaceQualityMetrics]
    model_name: str
    processing_time: float
    face_location: Optional[Tuple[int, int, int, int]]


class AdvancedFacePreprocessor:
    """Advanced preprocessing pipeline for face images"""
    
    def __init__(self):
        self.target_size = (224, 224)
        logger.info("✅ Advanced Face Preprocessor initialized")
    
    def align_face(self, face_image: np.ndarray, facial_area: Dict) -> np.ndarray:
        """
        Align face based on eye positions for consistent orientation
        """
        try:
            # Get eye positions from facial area (if available)
            left_eye = facial_area.get('left_eye')
            right_eye = facial_area.get('right_eye')
            
            if left_eye and right_eye:
                # Calculate angle between eyes
                dY = right_eye[1] - left_eye[1]
                dX = right_eye[0] - left_eye[0]
                angle = np.degrees(np.arctan2(dY, dX))
                
                # Get rotation matrix
                h, w = face_image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                
                # Apply rotation
                aligned = cv2.warpAffine(face_image, M, (w, h), 
                                        flags=cv2.INTER_CUBIC,
                                        borderMode=cv2.BORDER_REPLICATE)
                return aligned
            
            return face_image
        except Exception as e:
            logger.debug(f"Face alignment failed: {e}")
            return face_image
    
    def normalize_illumination(self, face_image: np.ndarray) -> np.ndarray:
        """
        Advanced illumination normalization using CLAHE
        """
        try:
            # Convert to LAB color space
            lab = cv2.cvtColor(face_image, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_clahe = clahe.apply(l)
            
            # Merge channels
            lab_clahe = cv2.merge([l_clahe, a, b])
            
            # Convert back to RGB
            normalized = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2RGB)
            
            return normalized
        except Exception as e:
            logger.debug(f"Illumination normalization failed: {e}")
            return face_image
    
    def enhance_sharpness(self, face_image: np.ndarray) -> np.ndarray:
        """
        Enhance face sharpness using unsharp masking
        """
        try:
            # Create Gaussian blur
            gaussian = cv2.GaussianBlur(face_image, (0, 0), 2.0)
            
            # Unsharp masking
            sharpened = cv2.addWeighted(face_image, 1.8, gaussian, -0.8, 0)
            
            return np.clip(sharpened, 0, 255).astype(np.uint8)
        except Exception as e:
            logger.debug(f"Sharpening failed: {e}")
            return face_image
    
    def reduce_noise(self, face_image: np.ndarray) -> np.ndarray:
        """
        Intelligent noise reduction
        """
        try:
            # Fast bilateral filter (edge-preserving denoising)
            denoised = cv2.bilateralFilter(face_image, 9, 75, 75)
            return denoised
        except Exception as e:
            logger.debug(f"Noise reduction failed: {e}")
            return face_image
    
    def super_resolution(self, face_image: np.ndarray) -> np.ndarray:
        """
        Simple super-resolution for low-quality images
        """
        try:
            h, w = face_image.shape[:2]
            
            # If image is too small, upscale
            if h < 112 or w < 112:
                scale = max(112 / h, 112 / w)
                new_size = (int(w * scale), int(h * scale))
                upscaled = cv2.resize(face_image, new_size, interpolation=cv2.INTER_CUBIC)
                
                # Apply sharpening after upscaling
                upscaled = self.enhance_sharpness(upscaled)
                return upscaled
            
            return face_image
        except Exception as e:
            logger.debug(f"Super-resolution failed: {e}")
            return face_image
    
    def preprocess_face(self, face_image: np.ndarray, 
                       facial_area: Optional[Dict] = None,
                       enable_alignment: bool = True,
                       enable_illumination: bool = True,
                       enable_sharpening: bool = True) -> np.ndarray:
        """
        Complete preprocessing pipeline
        """
        processed = face_image.copy()
        
        # 1. Super-resolution for small faces
        processed = self.super_resolution(processed)
        
        # 2. Face alignment
        if enable_alignment and facial_area:
            processed = self.align_face(processed, facial_area)
        
        # 3. Illumination normalization
        if enable_illumination:
            processed = self.normalize_illumination(processed)
        
        # 4. Noise reduction
        processed = self.reduce_noise(processed)
        
        # 5. Sharpness enhancement
        if enable_sharpening:
            processed = self.enhance_sharpness(processed)
        
        return processed


class FaceQualityAssessor:
    """Comprehensive face quality assessment system"""
    
    def __init__(self):
        self.min_sharpness = 50.0
        self.min_size = 40  # pixels
        self.ideal_brightness = (80, 180)
        self.min_contrast = 30
        logger.info("✅ Face Quality Assessor initialized")
    
    def assess_sharpness(self, face_image: np.ndarray) -> float:
        """
        Assess face sharpness using Laplacian variance
        """
        if len(face_image.shape) == 3:
            gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
        else:
            gray = face_image
        
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return laplacian_var
    
    def assess_brightness(self, face_image: np.ndarray) -> float:
        """
        Assess face brightness
        """
        if len(face_image.shape) == 3:
            gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
        else:
            gray = face_image
        
        mean_brightness = np.mean(gray)
        
        # Score based on optimal range
        if self.ideal_brightness[0] <= mean_brightness <= self.ideal_brightness[1]:
            score = 1.0
        else:
            deviation = min(abs(mean_brightness - self.ideal_brightness[0]),
                          abs(mean_brightness - self.ideal_brightness[1]))
            score = max(0, 1.0 - deviation / 100.0)
        
        return score
    
    def assess_contrast(self, face_image: np.ndarray) -> float:
        """
        Assess face contrast
        """
        if len(face_image.shape) == 3:
            gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
        else:
            gray = face_image
        
        contrast = np.std(gray)
        score = min(contrast / 50.0, 1.0)
        return score
    
    def detect_blur(self, face_image: np.ndarray) -> Tuple[bool, float]:
        """
        Detect if face is blurry using Laplacian
        """
        sharpness = self.assess_sharpness(face_image)
        is_blurry = sharpness < self.min_sharpness
        return is_blurry, sharpness
    
    def estimate_pose(self, face_image: np.ndarray) -> float:
        """
        Estimate face pose quality (frontal is best)
        Simple heuristic based on image symmetry
        """
        try:
            h, w = face_image.shape[:2]
            
            # Convert to grayscale
            if len(face_image.shape) == 3:
                gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
            else:
                gray = face_image
            
            # Compare left and right halves
            left_half = gray[:, :w//2]
            right_half = cv2.flip(gray[:, w//2:], 1)
            
            # Resize to same dimensions
            min_width = min(left_half.shape[1], right_half.shape[1])
            left_half = left_half[:, :min_width]
            right_half = right_half[:, :min_width]
            
            # Calculate similarity
            diff = np.abs(left_half.astype(float) - right_half.astype(float))
            symmetry_score = 1.0 - (np.mean(diff) / 255.0)
            
            return max(0, symmetry_score)
        except Exception as e:
            logger.debug(f"Pose estimation failed: {e}")
            return 0.7  # Default moderate score
    
    def detect_occlusion(self, face_image: np.ndarray) -> Tuple[bool, float]:
        """
        Detect if face is occluded (masks, hands, etc.)
        """
        try:
            # Convert to grayscale
            if len(face_image.shape) == 3:
                gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
            else:
                gray = face_image
            
            h, w = gray.shape
            
            # Check lower half of face (mouth/chin area)
            lower_face = gray[h//2:, :]
            
            # Detect uniform regions (potential masks)
            edges = cv2.Canny(lower_face, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            # Low edge density might indicate occlusion
            is_occluded = edge_density < 0.05
            occlusion_score = min(edge_density / 0.1, 1.0)
            
            return is_occluded, occlusion_score
        except Exception as e:
            logger.debug(f"Occlusion detection failed: {e}")
            return False, 1.0
    
    def assess_quality(self, face_image: np.ndarray, 
                      facial_area: Optional[Dict] = None) -> FaceQualityMetrics:
        """
        Comprehensive quality assessment
        """
        # Individual assessments
        sharpness = self.assess_sharpness(face_image)
        brightness_score = self.assess_brightness(face_image)
        contrast_score = self.assess_contrast(face_image)
        pose_score = self.estimate_pose(face_image)
        
        is_blurry, blur_score = self.detect_blur(face_image)
        is_occluded, occlusion_score = self.detect_occlusion(face_image)
        
        # Size score
        if facial_area:
            face_area = facial_area.get('w', 0) * facial_area.get('h', 0)
            size_score = min(face_area / 10000.0, 1.0)
        else:
            h, w = face_image.shape[:2]
            size_score = min((h * w) / 10000.0, 1.0)
        
        # Overall quality (weighted average)
        overall_quality = (
            (sharpness / 500.0) * 0.25 +  # Normalize sharpness
            brightness_score * 0.20 +
            contrast_score * 0.15 +
            size_score * 0.20 +
            pose_score * 0.10 +
            occlusion_score * 0.10
        )
        overall_quality = min(overall_quality, 1.0)
        
        # Determine if acceptable
        is_acceptable = (
            not is_blurry and
            not is_occluded and
            overall_quality >= 0.4 and
            size_score >= 0.3
        )
        
        return FaceQualityMetrics(
            sharpness=sharpness,
            brightness=brightness_score,
            contrast=contrast_score,
            size_score=size_score,
            pose_score=pose_score,
            occlusion_score=occlusion_score,
            overall_quality=overall_quality,
            is_acceptable=is_acceptable
        )


class EnsembleRecognitionSystem:
    """Multi-model ensemble recognition for improved accuracy"""
    
    def __init__(self, models_config: Optional[Dict] = None):
        """
        Initialize ensemble system with multiple models
        
        Args:
            models_config: Dict mapping model names to weights
                          e.g., {'ArcFace': 0.4, 'Facenet512': 0.3, 'SFace': 0.3}
        """
        self.models_config = models_config or {
            'ArcFace': {'weight': 0.45, 'threshold': 18.0},
            'Facenet512': {'weight': 0.35, 'threshold': 20.0},
            'SFace': {'weight': 0.20, 'threshold': 12.0}
        }
        
        self.preprocessor = AdvancedFacePreprocessor()
        self.quality_assessor = FaceQualityAssessor()
        
        # Build all models
        self._build_models()
        
        logger.info(f"✅ Ensemble System initialized with {len(self.models_config)} models")
    
    def _build_models(self):
        """Pre-build all models to avoid first-time delays"""
        for model_name in self.models_config.keys():
            try:
                DeepFace.build_model(model_name)
                logger.info(f"   ✅ {model_name} loaded")
            except Exception as e:
                logger.warning(f"   ⚠️ {model_name} failed to load: {e}")
    
    def generate_embedding_ensemble(self, face_image: np.ndarray,
                                   preprocess: bool = True) -> Dict[str, np.ndarray]:
        """
        Generate embeddings from all models
        """
        embeddings = {}
        
        # Preprocess face
        if preprocess:
            processed_face = self.preprocessor.preprocess_face(face_image)
        else:
            processed_face = face_image
        
        # Generate embeddings from each model
        for model_name in self.models_config.keys():
            try:
                result = DeepFace.represent(
                    img_path=processed_face,
                    model_name=model_name,
                    enforce_detection=False
                )
                embeddings[model_name] = np.array(result[0]["embedding"])
            except Exception as e:
                logger.warning(f"Embedding generation failed for {model_name}: {e}")
                continue
        
        return embeddings
    
    def recognize_with_ensemble(self, face_image: np.ndarray,
                               known_embeddings_dict: Dict[int, Dict[str, np.ndarray]],
                               min_confidence: float = 0.5) -> RecognitionResult:
        """
        Recognize face using ensemble of models
        
        Args:
            face_image: Face image to recognize
            known_embeddings_dict: Dict mapping student_id to dict of model embeddings
                                  e.g., {123: {'ArcFace': [emb], 'Facenet512': [emb]}}
            min_confidence: Minimum confidence threshold
        
        Returns:
            RecognitionResult with student_id and confidence
        """
        import time
        start_time = time.time()
        
        # Assess quality
        quality = self.quality_assessor.assess_quality(face_image)
        
        # Generate embeddings for input face
        input_embeddings = self.generate_embedding_ensemble(face_image, preprocess=True)
        
        if not input_embeddings:
            return RecognitionResult(
                student_id=None,
                confidence=0.0,
                distance=float('inf'),
                quality_metrics=quality,
                model_name='ensemble',
                processing_time=time.time() - start_time,
                face_location=None
            )
        
        # Calculate weighted votes for each student
        student_scores = {}
        
        for student_id, student_embeddings in known_embeddings_dict.items():
            total_weighted_score = 0
            total_weight = 0
            
            for model_name, input_emb in input_embeddings.items():
                if model_name not in student_embeddings:
                    continue
                
                known_emb = student_embeddings[model_name]
                config = self.models_config[model_name]
                weight = config['weight']
                threshold = config['threshold']
                
                # Calculate distance
                if model_name == 'ArcFace':
                    distance = np.linalg.norm(input_emb - known_emb)
                else:
                    # Cosine distance
                    distance = 1 - np.dot(input_emb, known_emb) / (
                        np.linalg.norm(input_emb) * np.linalg.norm(known_emb)
                    )
                    distance *= 100  # Scale to similar range as ArcFace
                
                # Calculate confidence
                confidence = max(0, 1 - (distance / threshold))
                
                # Weighted score
                total_weighted_score += confidence * weight
                total_weight += weight
            
            if total_weight > 0:
                avg_confidence = total_weighted_score / total_weight
                student_scores[student_id] = avg_confidence
        
        # Find best match
        if student_scores:
            best_student = max(student_scores, key=student_scores.get)
            best_confidence = student_scores[best_student]
            
            # Adjust confidence based on quality
            adjusted_confidence = best_confidence * (0.7 + 0.3 * quality.overall_quality)
            
            if adjusted_confidence >= min_confidence:
                return RecognitionResult(
                    student_id=best_student,
                    confidence=adjusted_confidence,
                    distance=1 - best_confidence,  # Approximate
                    quality_metrics=quality,
                    model_name='ensemble',
                    processing_time=time.time() - start_time,
                    face_location=None
                )
        
        # No match found
        return RecognitionResult(
            student_id=None,
            confidence=0.0,
            distance=float('inf'),
            quality_metrics=quality,
            model_name='ensemble',
            processing_time=time.time() - start_time,
            face_location=None
        )


class DataAugmentationEngine:
    """Generate augmented training data for improved robustness"""
    
    def __init__(self):
        logger.info("✅ Data Augmentation Engine initialized")
    
    def augment_face_for_registration(self, face_image: np.ndarray,
                                     num_variations: int = 5) -> List[np.ndarray]:
        """
        Generate augmented variations of a face for registration
        """
        augmented_faces = [face_image.copy()]  # Include original
        
        for i in range(num_variations):
            augmented = face_image.copy()
            
            # Random brightness adjustment
            if i % 2 == 0:
                brightness_factor = np.random.uniform(0.8, 1.2)
                augmented = np.clip(augmented * brightness_factor, 0, 255).astype(np.uint8)
            
            # Random contrast adjustment
            if i % 3 == 0:
                alpha = np.random.uniform(0.9, 1.1)
                augmented = cv2.convertScaleAbs(augmented, alpha=alpha, beta=0)
            
            # Small rotation
            if i % 4 == 0:
                angle = np.random.uniform(-10, 10)
                h, w = augmented.shape[:2]
                M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
                augmented = cv2.warpAffine(augmented, M, (w, h), 
                                          borderMode=cv2.BORDER_REPLICATE)
            
            # Add slight noise
            if i % 5 == 0:
                noise = np.random.normal(0, 5, augmented.shape)
                augmented = np.clip(augmented + noise, 0, 255).astype(np.uint8)
            
            augmented_faces.append(augmented)
        
        return augmented_faces


# Convenience functions for easy integration

def create_ensemble_system(use_ensemble: bool = True) -> Optional[EnsembleRecognitionSystem]:
    """
    Factory function to create ensemble system
    """
    if use_ensemble:
        return EnsembleRecognitionSystem()
    return None


def preprocess_face_advanced(face_image: np.ndarray) -> np.ndarray:
    """
    Quick preprocessing function
    """
    preprocessor = AdvancedFacePreprocessor()
    return preprocessor.preprocess_face(face_image)


def assess_face_quality(face_image: np.ndarray) -> FaceQualityMetrics:
    """
    Quick quality assessment function
    """
    assessor = FaceQualityAssessor()
    return assessor.assess_quality(face_image)


if __name__ == "__main__":
    # Test the system
    logger.info("Testing Accuracy Improvement System...")
    
    # Create test components
    preprocessor = AdvancedFacePreprocessor()
    quality_assessor = FaceQualityAssessor()
    
    logger.info("✅ All components initialized successfully")
    logger.info("🎯 System ready for accuracy improvements")
