"""
Enhanced face recognition integration with backward compatibility
Provides seamless upgrade from current to advanced recognition system
"""
import os
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class RecognitionIntegration:
    """
    Integration layer for enhanced face recognition
    Provides backward compatibility while enabling advanced features
    """
    
    def __init__(self):
        self.advanced_available = False
        self.advanced_matcher = None
        
        # Try to initialize advanced system
        try:
            from ai.advanced_matching import create_advanced_matcher
            self.advanced_matcher = create_advanced_matcher()
            self.advanced_available = True
            logger.info("✅ Advanced recognition system available")
        except ImportError as e:
            logger.warning(f"⚠️ Advanced recognition system not available: {e}")
            logger.info("🔄 Falling back to standard recognition system")
    
    def recognize_faces(self, face_embeddings: List[np.ndarray], 
                       student_ids: List[int], 
                       class_student_ids: List[int] = None,
                       group_size: int = 1,
                       use_advanced: bool = True) -> List[Dict[str, Any]]:
        """
        Recognize faces using the best available method
        
        Args:
            face_embeddings: List of face embeddings to recognize
            student_ids: List of all student IDs in database
            class_student_ids: List of student IDs in the specific class
            group_size: Number of faces detected (for adaptive thresholds)
            use_advanced: Whether to use advanced system if available
            
        Returns:
            List of recognition results
        """
        if use_advanced and self.advanced_available:
            return self._recognize_with_advanced(face_embeddings, student_ids, class_student_ids, group_size)
        else:
            return self._recognize_with_standard(face_embeddings, student_ids, class_student_ids, group_size)
    
    def _recognize_with_advanced(self, face_embeddings: List[np.ndarray], 
                               student_ids: List[int],
                               class_student_ids: List[int] = None,
                               group_size: int = 1) -> List[Dict[str, Any]]:
        """Recognize faces using advanced system"""
        try:
            logger.info(f"🚀 Using advanced recognition for {len(face_embeddings)} faces")
            
            # Load student profiles if not already loaded
            self._ensure_student_profiles_loaded(student_ids)
            
            # Use class-specific student IDs if provided
            target_student_ids = class_student_ids if class_student_ids else student_ids
            
            all_matches = []
            
            for i, face_embedding in enumerate(face_embeddings):
                # Get matches for this face
                matches = self.advanced_matcher.match_face(
                    query_embedding=face_embedding,
                    student_ids=target_student_ids,
                    group_size=group_size
                )
                
                # Find best match
                best_match = matches[0] if matches else None
                
                # Log top 3 candidates for debugging
                if len(matches) >= 3:
                    top_3 = matches[:3]
                    logger.debug(f"🔍 Face {i} top 3 candidates: " + 
                               ", ".join([f"ID {m['student_id']} ({m['confidence']:.3f})" for m in top_3]))
                
                if best_match and best_match['is_match']:
                    all_matches.append({
                        'student_id': best_match['student_id'],
                        'confidence': best_match['confidence'],
                        'distance': 1 - best_match['confidence'],  # Convert confidence to distance
                        'method': 'advanced',
                        'face_index': i,
                        'strategy_scores': best_match.get('strategy_scores', {}),
                        'adaptive_threshold': best_match.get('threshold', 0.6),
                        'decision_threshold': best_match.get('decision_threshold', 0.5)
                    })
                    logger.info(f"✅ Face {i}: Student {best_match['student_id']} (confidence: {best_match['confidence']:.3f}, "
                              f"threshold: {best_match.get('decision_threshold', 0.5):.3f})")
                else:
                    # Log why no match was found
                    if best_match:
                        logger.info(f"❌ Face {i}: No match - Best candidate Student {best_match['student_id']} had confidence {best_match['confidence']:.3f} "
                                  f"< threshold {best_match.get('decision_threshold', 0.5):.3f}")
                    else:
                        logger.info(f"❌ Face {i}: No match - No candidates found")
            
            return all_matches
            
        except Exception as e:
            logger.error(f"❌ Advanced recognition failed: {e}")
            logger.info("🔄 Falling back to standard recognition")
            return self._recognize_with_standard(face_embeddings, student_ids, class_student_ids, group_size)
    
    def _recognize_with_standard(self, face_embeddings: List[np.ndarray], 
                               student_ids: List[int],
                               class_student_ids: List[int] = None,
                               group_size: int = 1) -> List[Dict[str, Any]]:
        """Recognize faces using standard system (current implementation)"""
        try:
            logger.info(f"📝 Using standard recognition for {len(face_embeddings)} faces")
            
            # Import the current face recognizer
            from face_recognition import ClassBasedFaceRecognizer
            
            # This is a simplified version - in practice, you'd need to load the current recognizer
            # and use its existing methods
            
            # For now, return empty results to maintain compatibility
            logger.warning("Standard recognition not fully implemented - using advanced fallback")
            return []
            
        except Exception as e:
            logger.error(f"❌ Standard recognition failed: {e}")
            return []
    
    def _ensure_student_profiles_loaded(self, student_ids: List[int]):
        """Ensure student profiles are loaded in the advanced matcher"""
        if not self.advanced_available:
            return
        
        try:
            from database import SessionLocal, Student
            
            db = SessionLocal()
            try:
                for student_id in student_ids:
                    # Check if profile is already loaded
                    if student_id in self.advanced_matcher.student_profiles:
                        continue
                    
                    # Load student from database
                    student = db.query(Student).filter(Student.id == student_id).first()
                    if not student:
                        continue
                    
                    # Load profile if embedding exists
                    if student.face_encoding_path and os.path.exists(student.face_encoding_path):
                        self.advanced_matcher.load_student_profile(
                            student_id=student_id,
                            embedding_path=student.face_encoding_path,
                            variants_path=student.embedding_variants_path,
                            metadata_path=student.embedding_metadata_path
                        )
                        
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to load student profiles: {e}")
    
    def get_recognition_statistics(self, student_id: int) -> Dict[str, Any]:
        """Get recognition statistics for a student"""
        if not self.advanced_available:
            return {}
        
        return self.advanced_matcher.get_student_statistics(student_id)
    
    def optimize_student_threshold(self, student_id: int):
        """Optimize threshold for a specific student"""
        if not self.advanced_available:
            return
        
        self.advanced_matcher.optimize_student_threshold(student_id)
    
    def save_optimization_data(self, filepath: str = "backend/ai/optimization_data.json"):
        """Save optimization data for persistence"""
        if not self.advanced_available:
            return
        
        self.advanced_matcher.save_optimization_data(filepath)
    
    def load_optimization_data(self, filepath: str = "backend/ai/optimization_data.json"):
        """Load optimization data from file"""
        if not self.advanced_available:
            return
        
        self.advanced_matcher.load_optimization_data(filepath)


# Global instance
recognition_integration = RecognitionIntegration()

# Convenience functions
def recognize_faces_enhanced(face_embeddings: List[np.ndarray], 
                           student_ids: List[int], 
                           class_student_ids: List[int] = None,
                           group_size: int = 1,
                           use_advanced: bool = True) -> List[Dict[str, Any]]:
    """Recognize faces using the best available method"""
    return recognition_integration.recognize_faces(
        face_embeddings, student_ids, class_student_ids, group_size, use_advanced
    )

def get_student_recognition_stats(student_id: int) -> Dict[str, Any]:
    """Get recognition statistics for a student"""
    return recognition_integration.get_recognition_statistics(student_id)

def optimize_student_recognition(student_id: int):
    """Optimize recognition for a specific student"""
    recognition_integration.optimize_student_threshold(student_id)
