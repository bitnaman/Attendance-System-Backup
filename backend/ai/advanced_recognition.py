"""
Advanced AI/ML Features for Enhanced Face Recognition
Implements ensemble methods, confidence scoring, and adaptive learning
"""
import numpy as np
import cv2
import logging
from typing import List, Dict, Any, Tuple, Optional
from sklearn.ensemble import VotingClassifier
from sklearn.metrics.pairwise import cosine_similarity
import tensorflow as tf
from deepface import DeepFace
import joblib
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class EnsembleFaceRecognizer:
    """Advanced ensemble face recognition with multiple models"""
    
    def __init__(self):
        self.models = {
            'arcface': {'weight': 0.4, 'threshold': 18.0},
            'facenet512': {'weight': 0.3, 'threshold': 20.0},
            'facenet': {'weight': 0.2, 'threshold': 15.0},
            'ghostfacenet': {'weight': 0.1, 'threshold': 19.0}
        }
        self.adaptive_thresholds = {}
        self.confidence_history = {}
        
    def ensemble_recognition(self, face_image: np.ndarray, 
                           known_embeddings: List[np.ndarray],
                           student_ids: List[int]) -> Dict[str, Any]:
        """Advanced ensemble recognition with weighted voting"""
        
        model_predictions = {}
        model_confidences = {}
        
        # Get predictions from each model
        for model_name, config in self.models.items():
            try:
                embedding = DeepFace.represent(
                    img_path=face_image,
                    model_name=model_name,
                    enforce_detection=False
                )[0]["embedding"]
                
                # Calculate distances to known embeddings
                distances = []
                for known_emb in known_embeddings:
                    if model_name == 'arcface':
                        dist = np.linalg.norm(embedding - known_emb)
                    else:
                        dist = 1 - cosine_similarity([embedding], [known_emb])[0][0]
                    distances.append(dist)
                
                # Find best match
                min_distance = min(distances)
                best_idx = distances.index(min_distance)
                
                # Calculate confidence
                confidence = max(0, 1 - (min_distance / config['threshold']))
                
                model_predictions[model_name] = {
                    'student_id': student_ids[best_idx],
                    'distance': min_distance,
                    'confidence': confidence
                }
                model_confidences[model_name] = confidence
                
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}")
                continue
        
        # Weighted ensemble decision
        if not model_predictions:
            return {'student_id': None, 'confidence': 0.0, 'method': 'ensemble'}
        
        # Calculate weighted confidence
        total_weight = 0
        weighted_confidence = 0
        student_votes = {}
        
        for model_name, prediction in model_predictions.items():
            weight = self.models[model_name]['weight']
            student_id = prediction['student_id']
            confidence = prediction['confidence']
            
            if student_id not in student_votes:
                student_votes[student_id] = {'weighted_conf': 0, 'total_weight': 0}
            
            student_votes[student_id]['weighted_conf'] += confidence * weight
            student_votes[student_id]['total_weight'] += weight
            total_weight += weight
        
        # Find best student
        best_student = None
        best_confidence = 0
        
        for student_id, votes in student_votes.items():
            if votes['total_weight'] > 0:
                avg_confidence = votes['weighted_conf'] / votes['total_weight']
                if avg_confidence > best_confidence:
                    best_confidence = avg_confidence
                    best_student = student_id
        
        return {
            'student_id': best_student,
            'confidence': best_confidence,
            'method': 'ensemble',
            'model_predictions': model_predictions
        }


class AdaptiveLearningSystem:
    """Adaptive learning system that improves over time"""
    
    def __init__(self):
        self.learning_rate = 0.1
        self.confidence_threshold = 0.7
        self.adaptation_window = 30  # days
        
    def update_embeddings(self, student_id: int, new_face_image: np.ndarray,
                         current_embedding: np.ndarray) -> np.ndarray:
        """Update student embeddings with new data using exponential moving average"""
        
        # Generate new embedding
        new_embedding = DeepFace.represent(
            img_path=new_face_image,
            model_name='ArcFace',
            enforce_detection=False
        )[0]["embedding"]
        
        # Exponential moving average update
        updated_embedding = (1 - self.learning_rate) * current_embedding + \
                          self.learning_rate * new_embedding
        
        return updated_embedding
    
    def adaptive_threshold_adjustment(self, student_id: int, 
                                    recognition_history: List[Dict]) -> float:
        """Adjust recognition threshold based on historical performance"""
        
        if len(recognition_history) < 5:
            return 18.0  # Default threshold
        
        # Calculate success rate
        recent_history = recognition_history[-10:]  # Last 10 attempts
        success_rate = sum(1 for h in recent_history if h['success']) / len(recent_history)
        
        # Adjust threshold based on success rate
        base_threshold = 18.0
        if success_rate < 0.8:
            # Lower threshold for more lenient matching
            adjusted_threshold = base_threshold * 0.9
        elif success_rate > 0.95:
            # Higher threshold for more strict matching
            adjusted_threshold = base_threshold * 1.1
        else:
            adjusted_threshold = base_threshold
        
        return adjusted_threshold


class ConfidenceScoringSystem:
    """Advanced confidence scoring with multiple factors"""
    
    def __init__(self):
        self.factors = {
            'face_quality': 0.3,
            'lighting_condition': 0.2,
            'angle_variation': 0.2,
            'temporal_consistency': 0.3
        }
    
    def calculate_advanced_confidence(self, face_image: np.ndarray,
                                    embedding: np.ndarray,
                                    known_embedding: np.ndarray,
                                    previous_recognition: Optional[Dict] = None) -> float:
        """Calculate advanced confidence score with multiple factors"""
        
        # Base confidence from distance
        distance = np.linalg.norm(embedding - known_embedding)
        base_confidence = max(0, 1 - (distance / 18.0))
        
        # Face quality factor
        quality_score = self._assess_face_quality(face_image)
        
        # Lighting condition factor
        lighting_score = self._assess_lighting_condition(face_image)
        
        # Angle variation factor
        angle_score = self._assess_face_angle(face_image)
        
        # Temporal consistency factor
        temporal_score = 1.0
        if previous_recognition:
            temporal_score = self._assess_temporal_consistency(
                embedding, previous_recognition['embedding']
            )
        
        # Weighted confidence calculation
        advanced_confidence = (
            base_confidence * 0.4 +
            quality_score * self.factors['face_quality'] +
            lighting_score * self.factors['lighting_condition'] +
            angle_score * self.factors['angle_variation'] +
            temporal_score * self.factors['temporal_consistency']
        )
        
        return min(1.0, max(0.0, advanced_confidence))
    
    def _assess_face_quality(self, face_image: np.ndarray) -> float:
        """Assess face image quality using blur detection and sharpness"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        
        # Laplacian variance for sharpness
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize to 0-1 scale
        quality_score = min(1.0, laplacian_var / 1000.0)
        return quality_score
    
    def _assess_lighting_condition(self, face_image: np.ndarray) -> float:
        """Assess lighting condition using histogram analysis"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        
        # Calculate histogram spread
        mean_intensity = np.mean(gray)
        std_intensity = np.std(gray)
        
        # Good lighting: mean around 128, std > 30
        lighting_score = 1.0 - abs(mean_intensity - 128) / 128.0
        lighting_score *= min(1.0, std_intensity / 30.0)
        
        return max(0.0, lighting_score)
    
    def _assess_face_angle(self, face_image: np.ndarray) -> float:
        """Assess face angle using facial landmarks"""
        # This would use facial landmark detection
        # For now, return a default score
        return 0.8
    
    def _assess_temporal_consistency(self, current_embedding: np.ndarray,
                                   previous_embedding: np.ndarray) -> float:
        """Assess consistency with previous recognition"""
        similarity = cosine_similarity([current_embedding], [previous_embedding])[0][0]
        return similarity


class RealTimeLearning:
    """Real-time learning system for continuous improvement"""
    
    def __init__(self):
        self.feedback_buffer = []
        self.learning_enabled = True
        
    def add_feedback(self, student_id: int, prediction: Dict, 
                    actual_result: bool, confidence: float):
        """Add feedback for learning"""
        feedback = {
            'student_id': student_id,
            'prediction': prediction,
            'actual_result': actual_result,
            'confidence': confidence,
            'timestamp': datetime.now()
        }
        self.feedback_buffer.append(feedback)
        
        # Keep only recent feedback
        cutoff = datetime.now() - timedelta(days=30)
        self.feedback_buffer = [
            f for f in self.feedback_buffer if f['timestamp'] > cutoff
        ]
    
    def analyze_performance(self) -> Dict[str, Any]:
        """Analyze system performance and suggest improvements"""
        if not self.feedback_buffer:
            return {'status': 'insufficient_data'}
        
        total_predictions = len(self.feedback_buffer)
        correct_predictions = sum(1 for f in self.feedback_buffer if f['actual_result'])
        accuracy = correct_predictions / total_predictions
        
        # Analyze confidence distribution
        confidences = [f['confidence'] for f in self.feedback_buffer]
        avg_confidence = np.mean(confidences)
        
        # Identify problematic cases
        false_positives = [
            f for f in self.feedback_buffer 
            if not f['actual_result'] and f['confidence'] > 0.7
        ]
        
        return {
            'accuracy': accuracy,
            'total_predictions': total_predictions,
            'average_confidence': avg_confidence,
            'false_positives': len(false_positives),
            'recommendations': self._generate_recommendations(accuracy, avg_confidence)
        }
    
    def _generate_recommendations(self, accuracy: float, avg_confidence: float) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        if accuracy < 0.85:
            recommendations.append("Consider lowering recognition threshold")
        
        if avg_confidence < 0.6:
            recommendations.append("Improve image quality or lighting conditions")
        
        if accuracy > 0.95 and avg_confidence > 0.8:
            recommendations.append("System performing excellently - consider raising threshold")
        
        return recommendations


# Global instances
ensemble_recognizer = EnsembleFaceRecognizer()
adaptive_learning = AdaptiveLearningSystem()
confidence_scorer = ConfidenceScoringSystem()
real_time_learning = RealTimeLearning()
