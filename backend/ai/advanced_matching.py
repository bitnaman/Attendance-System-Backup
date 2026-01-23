"""
Advanced Face Matching System for High-Accuracy Recognition
Optimized for 100+ students with adaptive thresholds and ensemble methods
"""
import numpy as np
import logging
from typing import List, Dict, Any, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN
import json
import os
from datetime import datetime, timedelta

# Load threshold from environment
from config import MIN_CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)

class AdvancedFaceMatcher:
    """
    Advanced face matching system with:
    1. Adaptive Thresholds per Student
    2. Ensemble Matching Strategies
    3. Temporal Consistency Learning
    4. Group Photo Optimization
    5. Confidence Calibration
    """
    
    def __init__(self):
        self.student_profiles = {}  # Student-specific optimization data
        self.recognition_history = {}  # Track recognition patterns
        self.adaptive_thresholds = {}  # Per-student thresholds
        self.confidence_calibration = {}  # Confidence calibration data
        
        # Matching strategies
        self.strategies = {
            'primary': {'weight': 0.6, 'description': 'Primary embedding matching'},
            'variants': {'weight': 0.3, 'description': 'Variant embedding matching'},
            'ensemble': {'weight': 0.1, 'description': 'Ensemble model matching'}
        }
        
        # Quality thresholds
        self.quality_thresholds = {
            'high': 0.8,    # High quality images
            'medium': 0.6,  # Medium quality images
            'low': 0.4      # Low quality images
        }
    
    def load_student_profile(self, student_id: int, embedding_path: str, 
                           variants_path: str = None, metadata_path: str = None):
        """Load and optimize student profile"""
        try:
            # Load primary embedding
            primary_embedding = np.load(embedding_path)
            
            # Load variants if available
            variants = []
            if variants_path and os.path.exists(variants_path):
                variants = np.load(variants_path)
            
            # Load metadata if available
            metadata = {}
            if metadata_path and os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
            
            # Initialize student profile
            self.student_profiles[student_id] = {
                'primary_embedding': primary_embedding,
                'variants': variants,
                'metadata': metadata,
                'recognition_count': 0,
                'successful_matches': 0,
                'failed_matches': 0,
                'last_updated': datetime.now(),
                'adaptive_threshold': self._calculate_initial_threshold(primary_embedding, variants)
            }
            
            logger.info(f"📚 Loaded profile for student {student_id} (variants: {len(variants)})")
            
        except Exception as e:
            logger.error(f"Failed to load profile for student {student_id}: {e}")
    
    def _calculate_initial_threshold(self, primary_embedding: np.ndarray, 
                                   variants: List[np.ndarray]) -> float:
        """Calculate initial adaptive threshold for student"""
        if len(variants) <= 1:
            return 0.6  # Default threshold
        
        # Calculate intra-personal distances
        distances = []
        for variant in variants:
            dist = np.linalg.norm(primary_embedding - variant)
            distances.append(dist)
        
        # Use 95th percentile as initial threshold
        threshold = np.percentile(distances, 95)
        return min(0.8, max(0.3, threshold))  # Clamp between 0.3 and 0.8
    
    def match_face(self, query_embedding: np.ndarray, 
                  student_ids: List[int] = None,
                  group_size: int = 1) -> List[Dict[str, Any]]:
        """
        Advanced face matching with multiple strategies
        """
        if student_ids is None:
            student_ids = list(self.student_profiles.keys())
        
        matches = []
        
        for student_id in student_ids:
            if student_id not in self.student_profiles:
                continue
            
            profile = self.student_profiles[student_id]
            
            # Strategy 1: Primary embedding matching (always available)
            primary_score = self._match_primary(query_embedding, profile)
            
            # Strategy 2: Variant embedding matching (only if variants exist)
            variant_score = self._match_variants(query_embedding, profile)
            has_variants = len(profile.get('variants', [])) > 0
            
            # Calculate weighted final score - ONLY use available strategies
            if has_variants:
                # Full ensemble: primary (60%) + variants (30%) + ensemble (10%)
                ensemble_score = self._match_ensemble(query_embedding, profile)
                final_score = (
                    primary_score * 0.6 +
                    variant_score * 0.3 +
                    ensemble_score * 0.1
                )
            else:
                # No variants available - use primary score directly
                # This is the common case for most students
                final_score = primary_score
            
            # Apply adaptive threshold
            adaptive_threshold = self._get_adaptive_threshold(student_id, group_size)
            
            # Calculate confidence - now simplified to just use the score
            confidence = self._calculate_confidence(final_score, adaptive_threshold, profile)
            
            # Skip temporal consistency for simplicity (was causing issues)
            # confidence = self._apply_temporal_consistency(student_id, confidence)
            
            # Adaptive decision threshold based on group size
            # Use MIN_CONFIDENCE_THRESHOLD from .env as base (default 0.20)
            base_threshold = MIN_CONFIDENCE_THRESHOLD
            
            # For group photos, we need to be MORE lenient, not stricter
            # Reason: Group photos have lower quality faces due to distance, angle, lighting
            if group_size == 1:
                decision_threshold = base_threshold + 0.05  # 0.25 for single face (can be stricter)
            elif group_size <= 3:
                decision_threshold = base_threshold  # 0.20 for tiny groups
            elif group_size <= 6:
                decision_threshold = base_threshold - 0.02  # 0.18 for small groups
            elif group_size <= 10:
                decision_threshold = base_threshold - 0.03  # 0.17 for medium groups
            else:
                decision_threshold = base_threshold - 0.05  # 0.15 for large groups (most lenient)
            
            # Ensure threshold is reasonable
            decision_threshold = max(0.10, min(0.40, decision_threshold))
            
            logger.debug(f"Student {student_id}: confidence={confidence:.3f}, threshold={decision_threshold:.3f} (group_size={group_size})")
            
            matches.append({
                'student_id': student_id,
                'score': final_score,
                'confidence': confidence,
                'threshold': adaptive_threshold,
                'decision_threshold': decision_threshold,
                'is_match': confidence > decision_threshold,  # Adaptive decision threshold
                'strategy_scores': {
                    'primary': primary_score,
                    'variants': variant_score,
                    'ensemble': ensemble_score if has_variants else primary_score
                }
            })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Update recognition history
        self._update_recognition_history(matches)
        
        return matches
    
    def _match_primary(self, query_embedding: np.ndarray, profile: Dict) -> float:
        """Match using primary embedding"""
        primary_embedding = profile['primary_embedding']
        
        # Handle 2D embeddings (take first if multiple)
        if primary_embedding.ndim == 2:
            primary_embedding = primary_embedding[0] if len(primary_embedding) > 0 else primary_embedding.flatten()
        
        # Cosine similarity
        similarity = cosine_similarity([query_embedding], [primary_embedding])[0][0]
        
        # Convert to distance-based score with more lenient normalization
        distance = 1 - similarity
        score = max(0, 1 - (distance / 0.8))  # More lenient: normalize with 0.8 instead of 0.5
        
        return score
    
    def _match_variants(self, query_embedding: np.ndarray, profile: Dict) -> float:
        """Match using variant embeddings"""
        variants = profile['variants']
        
        if len(variants) == 0:
            return 0.0
        
        # Calculate similarity with each variant
        similarities = []
        for variant in variants:
            # Handle 2D variants
            if variant.ndim == 2:
                variant = variant[0] if len(variant) > 0 else variant.flatten()
            similarity = cosine_similarity([query_embedding], [variant])[0][0]
            similarities.append(similarity)
        
        # Use best similarity with more lenient normalization
        best_similarity = max(similarities)
        distance = 1 - best_similarity
        score = max(0, 1 - (distance / 0.8))  # More lenient: normalize with 0.8 instead of 0.5
        
        return score
    
    def _match_ensemble(self, query_embedding: np.ndarray, profile: Dict) -> float:
        """Match using ensemble strategy"""
        # This would use multiple models in practice
        # For now, use a combination of primary and variants
        primary_score = self._match_primary(query_embedding, profile)
        variant_score = self._match_variants(query_embedding, profile)
        
        return (primary_score + variant_score) / 2
    
    def _get_adaptive_threshold(self, student_id: int, group_size: int) -> float:
        """Get adaptive threshold based on student history and group size"""
        base_threshold = self.student_profiles[student_id]['adaptive_threshold']
        
        # Adjust for group size
        if group_size == 1:
            # Single person - use strict threshold
            group_factor = 1.0
        elif group_size <= 5:
            # Small group - slightly relaxed
            group_factor = 1.1
        elif group_size <= 20:
            # Medium group - more relaxed
            group_factor = 1.2
        else:
            # Large group - most relaxed
            group_factor = 1.3
        
        # Adjust based on recognition history
        profile = self.student_profiles[student_id]
        total_attempts = profile['successful_matches'] + profile['failed_matches']
        
        if total_attempts > 0:
            success_rate = profile['successful_matches'] / total_attempts
            
            if success_rate > 0.8:
                # High success rate - can be more strict
                history_factor = 0.95
            elif success_rate > 0.6:
                # Medium success rate - keep current
                history_factor = 1.0
            else:
                # Low success rate - be more lenient
                history_factor = 1.1
        else:
            history_factor = 1.0
        
        adaptive_threshold = base_threshold * group_factor * history_factor
        return min(0.9, max(0.2, adaptive_threshold))  # Clamp between 0.2 and 0.9
    
    def _calculate_confidence(self, score: float, threshold: float, profile: Dict) -> float:
        """
        Calculate confidence score - SIMPLIFIED for reliability
        
        Higher score = better match, confidence is how good the score is
        """
        # Simple confidence: score directly represents similarity
        # score is already 0-1 from cosine similarity transformation
        base_confidence = min(1.0, max(0.0, score))
        
        return base_confidence
    
    def _apply_temporal_consistency(self, student_id: int, confidence: float) -> float:
        """Apply temporal consistency based on recent recognition history"""
        if student_id not in self.recognition_history:
            return confidence
        
        history = self.recognition_history[student_id]
        recent_matches = [h for h in history if h['timestamp'] > datetime.now() - timedelta(hours=1)]
        
        if len(recent_matches) > 0:
            recent_confidences = [h['confidence'] for h in recent_matches]
            avg_recent_confidence = np.mean(recent_confidences)
            
            # Boost confidence if recent matches were successful
            if avg_recent_confidence > 0.7:
                confidence = min(1.0, confidence * 1.1)
            elif avg_recent_confidence < 0.3:
                confidence = max(0.0, confidence * 0.9)
        
        return confidence
    
    def _update_recognition_history(self, matches: List[Dict[str, Any]]):
        """Update recognition history for learning"""
        for match in matches:
            student_id = match['student_id']
            confidence = match['confidence']
            
            if student_id not in self.recognition_history:
                self.recognition_history[student_id] = []
            
            # Add to history
            self.recognition_history[student_id].append({
                'timestamp': datetime.now(),
                'confidence': confidence,
                'is_match': match['is_match']
            })
            
            # Keep only recent history (last 24 hours)
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.recognition_history[student_id] = [
                h for h in self.recognition_history[student_id] 
                if h['timestamp'] > cutoff_time
            ]
            
            # Update profile statistics
            if match['is_match']:
                self.student_profiles[student_id]['successful_matches'] += 1
            else:
                self.student_profiles[student_id]['failed_matches'] += 1
            
            self.student_profiles[student_id]['recognition_count'] += 1
    
    def optimize_student_threshold(self, student_id: int):
        """Optimize threshold for specific student based on history"""
        if student_id not in self.student_profiles:
            return
        
        profile = self.student_profiles[student_id]
        total_attempts = profile['successful_matches'] + profile['failed_matches']
        
        if total_attempts < 5:  # Need minimum data
            return
        
        success_rate = profile['successful_matches'] / total_attempts
        
        # Adjust threshold based on success rate
        current_threshold = profile['adaptive_threshold']
        
        if success_rate > 0.8:
            # High success rate - can be more strict
            new_threshold = current_threshold * 0.95
        elif success_rate < 0.5:
            # Low success rate - be more lenient
            new_threshold = current_threshold * 1.05
        else:
            # Good success rate - keep current
            new_threshold = current_threshold
        
        # Update threshold
        self.student_profiles[student_id]['adaptive_threshold'] = min(0.9, max(0.2, new_threshold))
        
        logger.info(f"🎯 Optimized threshold for student {student_id}: {new_threshold:.3f} (success rate: {success_rate:.2f})")
    
    def get_student_statistics(self, student_id: int) -> Dict[str, Any]:
        """Get recognition statistics for a student"""
        if student_id not in self.student_profiles:
            return {}
        
        profile = self.student_profiles[student_id]
        total_attempts = profile['successful_matches'] + profile['failed_matches']
        
        return {
            'student_id': student_id,
            'total_attempts': total_attempts,
            'successful_matches': profile['successful_matches'],
            'failed_matches': profile['failed_matches'],
            'success_rate': profile['successful_matches'] / total_attempts if total_attempts > 0 else 0,
            'adaptive_threshold': profile['adaptive_threshold'],
            'last_updated': profile['last_updated'].isoformat(),
            'embedding_confidence': profile['metadata'].get('confidence_score', 0.8)
        }
    
    def save_optimization_data(self, filepath: str):
        """Save optimization data for persistence"""
        data = {
            'student_profiles': {},
            'recognition_history': {},
            'adaptive_thresholds': self.adaptive_thresholds,
            'saved_at': datetime.now().isoformat()
        }
        
        # Convert datetime objects to strings for JSON serialization
        for student_id, profile in self.student_profiles.items():
            profile_copy = profile.copy()
            profile_copy['last_updated'] = profile_copy['last_updated'].isoformat()
            data['student_profiles'][str(student_id)] = profile_copy
        
        for student_id, history in self.recognition_history.items():
            data['recognition_history'][str(student_id)] = [
                {**h, 'timestamp': h['timestamp'].isoformat()} for h in history
            ]
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"💾 Saved optimization data to {filepath}")
    
    def load_optimization_data(self, filepath: str):
        """Load optimization data from file"""
        if not os.path.exists(filepath):
            return
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Load student profiles
            for student_id_str, profile in data.get('student_profiles', {}).items():
                student_id = int(student_id_str)
                profile['last_updated'] = datetime.fromisoformat(profile['last_updated'])
                self.student_profiles[student_id] = profile
            
            # Load recognition history
            for student_id_str, history in data.get('recognition_history', {}).items():
                student_id = int(student_id_str)
                self.recognition_history[student_id] = [
                    {**h, 'timestamp': datetime.fromisoformat(h['timestamp'])} for h in history
                ]
            
            self.adaptive_thresholds = data.get('adaptive_thresholds', {})
            
            logger.info(f"📚 Loaded optimization data from {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to load optimization data: {e}")

# Integration function
def create_advanced_matcher():
    """Create and configure advanced face matcher"""
    matcher = AdvancedFaceMatcher()
    
    # Load existing optimization data if available
    optimization_file = "backend/ai/optimization_data.json"
    matcher.load_optimization_data(optimization_file)
    
    return matcher
