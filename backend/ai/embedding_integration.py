"""
Backward-compatible integration for enhanced face embeddings
Provides seamless upgrade path from current to enhanced system
"""
import os
import logging
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class EmbeddingIntegration:
    """
    Integration layer that provides backward compatibility
    while enabling enhanced embedding features
    """
    
    def __init__(self):
        self.enhanced_available = False
        self.enhanced_generator = None
        
        # Try to initialize enhanced system
        try:
            from ai.enhanced_embedding import EnhancedEmbeddingGenerator
            self.enhanced_generator = EnhancedEmbeddingGenerator()
            self.enhanced_available = True
            logger.info("✅ Enhanced embedding system available")
        except ImportError as e:
            logger.warning(f"⚠️ Enhanced embedding system not available: {e}")
            logger.info("🔄 Falling back to standard embedding system")
    
    def generate_embeddings(self, image_paths: List[str], student_name: str, 
                          student_roll_no: str, use_enhanced: bool = True) -> Dict[str, Any]:
        """
        Generate embeddings using the best available method
        
        Args:
            image_paths: List of image file paths
            student_name: Student's name
            student_roll_no: Student's roll number
            use_enhanced: Whether to use enhanced system if available
            
        Returns:
            Dictionary with embedding information
        """
        if use_enhanced and self.enhanced_available:
            return self._generate_enhanced_embeddings(image_paths, student_name, student_roll_no)
        else:
            return self._generate_standard_embeddings(image_paths, student_name, student_roll_no)
    
    def _generate_enhanced_embeddings(self, image_paths: List[str], student_name: str, 
                                    student_roll_no: str) -> Dict[str, Any]:
        """Generate embeddings using enhanced system"""
        try:
            logger.info(f"🚀 Using enhanced embedding generation for {student_name}")
            
            result = self.enhanced_generator.generate_enhanced_embedding(
                image_paths=image_paths,
                student_name=student_name,
                student_roll_no=student_roll_no
            )
            
            # Create output directory
            output_dir = f"static/dataset/{student_name.replace(' ', '_')}_{student_roll_no}"
            os.makedirs(output_dir, exist_ok=True)
            
            # Save primary embedding
            primary_path = os.path.join(output_dir, "face_embedding.npy")
            np.save(primary_path, result['primary_embedding'])
            
            # Save variants
            variants_path = os.path.join(output_dir, "embedding_variants.npy")
            np.save(variants_path, result['embedding_variants'])
            
            # Save metadata
            metadata = {
                'confidence_score': result['confidence_score'],
                'quality_scores': result['quality_scores'],
                'generated_at': datetime.now().isoformat(),
                'method': 'enhanced_ensemble',
                'models_used': list(result['ensemble_embeddings'].keys())
            }
            
            import json
            metadata_path = os.path.join(output_dir, "embedding_metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Copy first image as face.jpg
            face_photo_path = os.path.join(output_dir, "face.jpg")
            if image_paths and os.path.exists(image_paths[0]):
                import shutil
                shutil.copy(image_paths[0], face_photo_path)
            
            logger.info(f"🎯 Enhanced embedding saved for {student_name} (confidence: {result['confidence_score']:.3f})")
            
            return {
                'photo_path': face_photo_path,
                'embedding_path': primary_path,
                'variants_path': variants_path,
                'metadata_path': metadata_path,
                'confidence_score': result['confidence_score'],
                'method': 'enhanced',
                'quality_scores': result['quality_scores']
            }
            
        except Exception as e:
            logger.error(f"❌ Enhanced embedding generation failed: {e}")
            logger.info("🔄 Falling back to standard embedding generation")
            return self._generate_standard_embeddings(image_paths, student_name, student_roll_no)
    
    def _generate_standard_embeddings(self, image_paths: List[str], student_name: str, 
                                    student_roll_no: str) -> Dict[str, Any]:
        """Generate embeddings using standard system (current implementation)"""
        try:
            logger.info(f"📝 Using standard embedding generation for {student_name}")
            
            # Import the current face recognizer
            from face_recognition import ClassBasedFaceRecognizer
            
            if len(image_paths) == 1:
                embedding_info = ClassBasedFaceRecognizer.generate_and_save_embedding(
                    image_path=image_paths[0],
                    student_name=student_name,
                    student_roll_no=student_roll_no
                )
            else:
                embedding_info = ClassBasedFaceRecognizer.generate_and_save_embeddings(
                    image_paths=image_paths,
                    student_name=student_name,
                    student_roll_no=student_roll_no
                )
            
            # Add standard system metadata
            embedding_info.update({
                'method': 'standard',
                'confidence_score': 0.8,  # Default confidence for standard system
                'quality_scores': [{'overall': 0.8} for _ in image_paths]  # Default quality scores
            })
            
            logger.info(f"✅ Standard embedding saved for {student_name}")
            return embedding_info
            
        except Exception as e:
            logger.error(f"❌ Standard embedding generation failed: {e}")
            raise
    
    def get_embedding_info(self, student_id: int, db) -> Dict[str, Any]:
        """
        Get embedding information for a student, checking both enhanced and standard data
        
        Args:
            student_id: Student ID
            db: Database session
            
        Returns:
            Dictionary with embedding information
        """
        from database import Student
        
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {}
        
        embedding_info = {
            'student_id': student_id,
            'name': student.name,
            'roll_no': student.roll_no,
            'primary_embedding_path': student.face_encoding_path,
            'variants_path': student.embedding_variants_path,
            'metadata_path': student.embedding_metadata_path,
            'confidence_score': student.embedding_confidence or 0.8,
            'adaptive_threshold': student.adaptive_threshold or 0.6,
            'method': 'unknown'
        }
        
        # Determine which method was used
        if student.embedding_variants_path and os.path.exists(student.embedding_variants_path):
            embedding_info['method'] = 'enhanced'
        elif student.face_encoding_path and os.path.exists(student.face_encoding_path):
            embedding_info['method'] = 'standard'
        
        return embedding_info
    
    def upgrade_student_embedding(self, student_id: int, db) -> bool:
        """
        Upgrade a student's embedding from standard to enhanced system
        
        Args:
            student_id: Student ID
            db: Database session
            
        Returns:
            True if upgrade was successful
        """
        if not self.enhanced_available:
            logger.warning("Enhanced system not available for upgrade")
            return False
        
        try:
            from database import Student
            
            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                logger.error(f"Student {student_id} not found")
                return False
            
            # Check if already enhanced
            if student.embedding_variants_path and os.path.exists(student.embedding_variants_path):
                logger.info(f"Student {student_id} already has enhanced embeddings")
                return True
            
            # Get original images - use absolute path
            student_dir = os.path.join(os.getcwd(), f"static/dataset/{student.name.replace(' ', '_')}_{student.roll_no}")
            if not os.path.exists(student_dir):
                logger.error(f"Student directory not found: {student_dir}")
                return False
            
            # Find all images in student directory (avoid duplicates)
            image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
            image_paths = []
            file_hashes = set()  # Track file hashes to avoid duplicates
            
            for file in os.listdir(student_dir):
                if any(file.lower().endswith(ext) for ext in image_extensions):
                    file_path = os.path.join(student_dir, file)
                    
                    # Calculate file hash to detect duplicates
                    try:
                        import hashlib
                        with open(file_path, 'rb') as f:
                            file_hash = hashlib.md5(f.read()).hexdigest()
                        
                        if file_hash not in file_hashes:
                            file_hashes.add(file_hash)
                            image_paths.append(file_path)
                        else:
                            logger.debug(f"Skipping duplicate file: {file}")
                    except Exception as e:
                        logger.warning(f"Could not hash file {file}: {e}")
                        # If hashing fails, just add the file
                        image_paths.append(file_path)
            
            if not image_paths:
                logger.error(f"No images found for student {student_id}")
                return False
            
            # Generate enhanced embeddings
            result = self._generate_enhanced_embeddings(
                image_paths=image_paths,
                student_name=student.name,
                student_roll_no=student.roll_no
            )
            
            # Update database
            student.embedding_variants_path = result['variants_path']
            student.embedding_metadata_path = result['metadata_path']
            student.embedding_confidence = result['confidence_score']
            student.adaptive_threshold = 0.6  # Default adaptive threshold
            
            db.commit()
            
            logger.info(f"✅ Successfully upgraded student {student_id} to enhanced embeddings")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to upgrade student {student_id}: {e}")
            db.rollback()
            return False

# Global instance
embedding_integration = EmbeddingIntegration()

# Convenience functions
def generate_student_embeddings(image_paths: List[str], student_name: str, 
                              student_roll_no: str, use_enhanced: bool = True) -> Dict[str, Any]:
    """Generate embeddings for a student using the best available method"""
    return embedding_integration.generate_embeddings(image_paths, student_name, student_roll_no, use_enhanced)

def get_student_embedding_info(student_id: int, db) -> Dict[str, Any]:
    """Get embedding information for a student"""
    return embedding_integration.get_embedding_info(student_id, db)

def upgrade_student_to_enhanced(student_id: int, db) -> bool:
    """Upgrade a student's embeddings to enhanced system"""
    return embedding_integration.upgrade_student_embedding(student_id, db)
