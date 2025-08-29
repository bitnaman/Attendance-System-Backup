"""
PostgreSQL-Compatible Face Recognition with Class-Based Filtering.
Enhanced for class-specific attendance marking with configurable logging.
"""
import os
import cv2
import numpy as np
import logging
import shutil
from typing import Dict, Any, List, Tuple, Optional
from deepface import DeepFace
from utils.logging_utils import create_throttled_logger
from config import LOG_THROTTLE_MS

# --- Enhanced Configuration Constants for Better Accuracy ---
RECOGNITION_MODEL = "Facenet512"  # A very powerful and common model
DETECTOR_BACKEND = "mtcnn"        # A high-accuracy detector
DISTANCE_THRESHOLD = 20.0         # Distance threshold for matching
MIN_CONFIDENCE_THRESHOLD = 0.10   # Minimum confidence to consider a match (10%)
ENHANCED_PREPROCESSING = True      # Enable enhanced image preprocessing

# Create throttled logger for face recognition
logger = create_throttled_logger(__name__, LOG_THROTTLE_MS)


class ClassBasedFaceRecognizer:
    """
    Face recognition system with class-based filtering for PostgreSQL backend.
    """
    def __init__(self):
        """
        Initializes the recognizer with class-based support.
        """
        self.known_students_db = []
        self.current_class_students = []  # Students for currently selected class
        self.gpu_available = False
        self.tf_version = None
        
        # Check TensorFlow and GPU status first
        self._check_tensorflow_setup()
        
        # Build the model once to avoid slow first-time calls
        try:
            DeepFace.build_model(RECOGNITION_MODEL)
            logger.info(f"✅ {RECOGNITION_MODEL} model built successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to build face recognition model: {e}")
            raise

    def _check_tensorflow_setup(self):
        """
        Check TensorFlow installation and GPU availability.
        Only configure if everything is working properly.
        """
        try:
            import tensorflow as tf
            self.tf_version = tf.__version__
            logger.info(f"✅ TensorFlow {self.tf_version} loaded successfully.")
            
            # Check for GPU availability
            gpus = tf.config.list_physical_devices('GPU')
            
            if gpus:
                try:
                    # Enable memory growth for all GPUs to prevent memory issues
                    for gpu in gpus:
                        tf.config.experimental.set_memory_growth(gpu, True)
                    
                    # Test GPU computation to ensure it actually works
                    with tf.device('/GPU:0'):
                        test_tensor = tf.constant([1.0, 2.0, 3.0])
                        test_result = tf.reduce_sum(test_tensor)
                    
                    self.gpu_available = True
                    logger.info(f"✅ GPU acceleration enabled! Detected {len(gpus)} GPU(s):")
                    for i, gpu in enumerate(gpus):
                        logger.info(f"   GPU {i}: {gpu.name}")
                    logger.info(f"✅ GPU computation test passed: {test_result.numpy()}")
                    
                except Exception as gpu_error:
                    self.gpu_available = False
                    logger.warning(f"⚠️  GPU detected but computation failed: {gpu_error}")
                    logger.warning("💡 Falling back to CPU computation. Face recognition will be slower.")
            else:
                self.gpu_available = False
                logger.info("ℹ️  No GPU detected. Using CPU for face recognition.")
                logger.info("💡 For faster performance, ensure you have:")
                logger.info("   - NVIDIA GPU with CUDA support")
                logger.info("   - TensorFlow with CUDA libraries installed")
                logger.info("   - Run: pip install tensorflow[and-cuda]")
                
        except ImportError:
            logger.error("❌ TensorFlow not found! Please install it:")
            logger.error("   pip install tensorflow[and-cuda]")
            raise ImportError("TensorFlow is required for face recognition")
        except Exception as e:
            logger.error(f"❌ TensorFlow setup failed: {e}")
            raise

    def load_all_students(self, db_session):
        """Load all active students from PostgreSQL database."""
        from database import Student, Class  # Local import to avoid circular dependency
        logger.info("Loading all active students from PostgreSQL...")
        self.known_students_db = []
        
        # Join students with their classes
        active_students = db_session.query(Student).join(Class).filter(
            Student.is_active == True,
            Class.is_active == True
        ).all()
        
        for student in active_students:
            path = student.face_encoding_path
            if path:
                # Normalize path - convert forward slashes to OS-specific separator
                path = path.replace('/', os.path.sep)
                
                # Handle both relative and absolute paths
                if not os.path.isabs(path):
                    possible_paths = [
                        path,
                        os.path.join(os.getcwd(), path),
                        os.path.join('backend', path),
                    ]
                else:
                    possible_paths = [path]
                    
                full_path = None
                for p in possible_paths:
                    if os.path.exists(p):
                        full_path = p
                        break
                        
                if full_path:
                    try:
                        embedding = np.load(full_path)
                        
                        # Enhanced embedding processing for better accuracy
                        if embedding.ndim == 2:
                            # Multiple embeddings detected - use enhanced averaging
                            if len(embedding) > 1:
                                # Quality-weighted averaging (same as registration)
                                mean_embedding = np.mean(embedding, axis=0)
                                quality_scores = []
                                
                                for emb in embedding:
                                    distance_from_mean = np.linalg.norm(emb - mean_embedding)
                                    quality_scores.append(1.0 / (1.0 + distance_from_mean))
                                
                                quality_scores = np.array(quality_scores)
                                quality_weights = quality_scores / np.sum(quality_scores)
                                embedding = np.average(embedding, axis=0, weights=quality_weights)
                                
                                logger.debug(f"🎯 Enhanced averaging for {student.name}: {len(quality_scores)} embeddings")
                            else:
                                embedding = embedding[0]  # Single embedding in 2D array
                                
                        self.known_students_db.append({
                            'id': student.id,
                            'name': student.name,
                            'roll_no': student.roll_no,
                            'class_id': student.class_id,
                            'class_name': student.class_obj.name,
                            'class_section': student.class_section,
                            'embedding': embedding
                        })
                        logger.info(f"✅ Enhanced embedding loaded for {student.name} (Class: {student.class_obj.name} {student.class_section})")
                    except Exception as e:
                        logger.warning(f"Could not load encoding for {student.name}: {e}")
        
        logger.info(f"Loaded {len(self.known_students_db)} student embeddings from PostgreSQL.")

    def load_class_students(self, db_session, class_id: int):
        """Load students for a specific class only."""
        from database import Student, Class
        logger.info(f"Loading students for class ID: {class_id}")
        
        class_obj = db_session.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            logger.error(f"Class with ID {class_id} not found")
            return
            
        self.current_class_students = []
        students = db_session.query(Student).filter(
            Student.class_id == class_id,
            Student.is_active == True
        ).all()
        
        for student in students:
            # Find student in known_students_db
            for known_student in self.known_students_db:
                if known_student['id'] == student.id:
                    self.current_class_students.append(known_student)
                    break
        
        logger.info(f"Loaded {len(self.current_class_students)} students for class {class_obj.name} {class_obj.section}")

    def add_student_to_memory(self, student_info: Dict):
        """Add a single student's embedding to memory with enhanced processing."""
        path = student_info.get('face_encoding_path')
        if path and os.path.exists(path):
            try:
                embedding = np.load(path)
                
                # Enhanced embedding processing
                if embedding.ndim == 2:
                    if len(embedding) > 1:
                        # Quality-weighted averaging for multiple embeddings
                        mean_embedding = np.mean(embedding, axis=0)
                        quality_scores = []
                        
                        for emb in embedding:
                            distance_from_mean = np.linalg.norm(emb - mean_embedding)
                            quality_scores.append(1.0 / (1.0 + distance_from_mean))
                        
                        quality_scores = np.array(quality_scores)
                        quality_weights = quality_scores / np.sum(quality_scores)
                        embedding = np.average(embedding, axis=0, weights=quality_weights)
                        
                        logger.debug(f"🎯 Enhanced averaging for new student: {len(quality_scores)} embeddings")
                    else:
                        embedding = embedding[0]
                
                # Remove if already exists
                self.known_students_db = [s for s in self.known_students_db if s['id'] != student_info['id']]
                
                student_data = {
                    'id': student_info['id'],
                    'name': student_info['name'],
                    'roll_no': student_info['roll_no'],
                    'class_id': student_info.get('class_id'),
                    'class_name': student_info.get('class_name', ''),
                    'class_section': student_info.get('class_section', ''),
                    'embedding': embedding
                }
                self.known_students_db.append(student_data)
                logger.info(f"✅ Enhanced embedding added to memory for {student_info['name']}")
            except Exception as e:
                logger.warning(f"Could not load encoding for {student_info['name']}: {e}")

    def remove_student_from_memory(self, student_id: int):
        """Remove a student from memory."""
        original_count = len(self.known_students_db)
        self.known_students_db = [s for s in self.known_students_db if s['id'] != student_id]
        self.current_class_students = [s for s in self.current_class_students if s['id'] != student_id]
        
        if len(self.known_students_db) < original_count:
            logger.info(f"Removed student with ID {student_id} from memory.")

    @staticmethod
    def _student_output_dir(student_name: str, student_roll_no: str) -> Tuple[str, str, str]:
        from config import STATIC_DIR  # Import here to avoid circular imports
        student_dir_name = f"{student_name.replace(' ', '_')}_{student_roll_no}"
        output_dir = STATIC_DIR / "dataset" / student_dir_name
        output_dir.mkdir(parents=True, exist_ok=True)
        final_photo_path = output_dir / "face.jpg"
        embedding_path = output_dir / "face_embedding.npy"
        return str(output_dir), str(final_photo_path), str(embedding_path)

    @staticmethod
    def generate_and_save_embedding(image_path: str, student_name: str, student_roll_no: str) -> Dict[str, str]:
        """Generate and save face embedding."""
        try:
            output_dir, final_photo_path, embedding_path = ClassBasedFaceRecognizer._student_output_dir(student_name, student_roll_no)

            shutil.copy(image_path, final_photo_path)

            embedding_obj = DeepFace.represent(
                img_path=final_photo_path,
                model_name=RECOGNITION_MODEL,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )
            
            embedding = embedding_obj[0]["embedding"]  # type: ignore
            np.save(embedding_path, embedding)
            logger.info(f"Embedding saved to {embedding_path}")

            return {"photo_path": final_photo_path, "embedding_path": embedding_path}

        except Exception as e:
            logger.error(f"Failed to generate embedding for {image_path}: {e}")
            raise ValueError(f"Could not process image. Ensure it contains one clear face. Error: {e}") from e

    @staticmethod
    def generate_and_save_embeddings(image_paths: List[str], student_name: str, student_roll_no: str) -> Dict[str, str]:
        """Generate embeddings from multiple images with enhanced preprocessing."""
        if not image_paths:
            raise ValueError("No images provided for embedding generation")
        try:
            output_dir, final_photo_path, embedding_path = ClassBasedFaceRecognizer._student_output_dir(student_name, student_roll_no)
            shutil.copy(image_paths[0], final_photo_path)

            all_embeddings: List[np.ndarray] = []
            valid_images_count = 0
            
            for p in image_paths:
                try:
                    # Enhanced preprocessing: Multiple extractions for robustness
                    if ENHANCED_PREPROCESSING:
                        # Try multiple detector backends for better face extraction
                        detectors = ['mtcnn', 'retinaface', 'opencv']
                        embedding_extracted = False
                        
                        for detector in detectors:
                            try:
                                emb_obj = DeepFace.represent(
                                    img_path=p,
                                    model_name=RECOGNITION_MODEL,
                                    detector_backend=detector,
                                    enforce_detection=True,
                                    align=True,  # Enable face alignment for consistency
                                    normalization='Facenet2018'  # Use advanced normalization
                                )
                                all_embeddings.append(np.array(emb_obj[0]["embedding"]))  # type: ignore
                                valid_images_count += 1
                                embedding_extracted = True
                                logger.info(f"✅ Successfully extracted embedding from {p} using {detector}")
                                break
                            except Exception as det_e:
                                logger.debug(f"Detector {detector} failed for {p}: {det_e}")
                                continue
                        
                        if not embedding_extracted:
                            logger.warning(f"⚠️ All detectors failed for image {p}")
                    else:
                        # Original method
                        emb_obj = DeepFace.represent(
                            img_path=p,
                            model_name=RECOGNITION_MODEL,
                            detector_backend=DETECTOR_BACKEND,
                            enforce_detection=True
                        )
                        all_embeddings.append(np.array(emb_obj[0]["embedding"]))  # type: ignore
                        valid_images_count += 1
                        
                except Exception as e:
                    logger.warning(f"Skipping image {p} due to embedding error: {e}")

            if not all_embeddings:
                raise ValueError("None of the provided images contained a valid, clear single face")

            # Enhanced averaging: Use weighted average based on quality metrics
            if len(all_embeddings) > 1:
                stacked = np.stack(all_embeddings, axis=0)
                
                # Calculate embedding quality scores (based on L2 norm consistency)
                mean_embedding = np.mean(stacked, axis=0)
                quality_scores = []
                
                for emb in all_embeddings:
                    # Quality = inverse of distance from mean (more consistent = higher quality)
                    distance_from_mean = np.linalg.norm(emb - mean_embedding)
                    quality_scores.append(1.0 / (1.0 + distance_from_mean))
                
                # Normalize quality scores to sum to 1
                quality_scores = np.array(quality_scores)
                quality_weights = quality_scores / np.sum(quality_scores)
                
                # Weighted average for final embedding
                final_embedding = np.average(stacked, axis=0, weights=quality_weights)
                
                logger.info(f"📊 Enhanced averaging: {len(all_embeddings)} embeddings, quality weights: {quality_weights}")
                
                # Save both individual embeddings and final weighted average
                np.save(embedding_path, stacked)  # Keep individual embeddings for potential future use
            else:
                stacked = np.stack(all_embeddings, axis=0)
                np.save(embedding_path, stacked)
                
            logger.info(f"💾 Saved {stacked.shape[0]} high-quality embeddings to {embedding_path}")
            logger.info(f"✨ Registration success rate: {valid_images_count}/{len(image_paths)} images processed")
            
            return {"photo_path": final_photo_path, "embedding_path": embedding_path}
        except Exception as e:
            logger.error(f"Failed multi-image embedding: {e}")
            raise ValueError(f"Could not process provided images. {e}") from e

    def process_class_photo(self, image_path: str, class_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Process classroom photo with class-specific filtering.
        
        Args:
            image_path: Path to the classroom photo
            class_id: If provided, only match against students from this class
        """
        import time
        start_time = time.time()
        
        # Determine which student database to use
        if class_id and self.current_class_students:
            students_to_match = self.current_class_students
            logger.info(f"Matching against {len(students_to_match)} students from class {class_id}")
        elif self.known_students_db:
            students_to_match = self.known_students_db
            logger.info(f"Matching against all {len(students_to_match)} students")
        else:
            logger.warning("No students loaded for matching")
            return {
                "total_faces_detected": 0,
                "identified_students": [],
                "unidentified_faces_count": 0,
                "error": "No students loaded in the recognizer."
            }

        face_detection_start = time.time()
        try:
            detected_faces = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False
            )
        except Exception as e:
            logger.error(f"DeepFace.extract_faces failed for image {image_path}: {e}")
            return {"error": f"Face extraction failed: {e}"}
        
        face_detection_time = time.time() - face_detection_start
        logger.info(f"⏱️ Face Detection: {face_detection_time:.2f}s - Found {len(detected_faces)} faces")

        results = {
            "total_faces_detected": len(detected_faces),
            "identified_students": [],
            "unidentified_faces_count": 0,
            "class_id": class_id
        }
        
        if not detected_faces:
            logger.info("No faces detected in the provided image.")
            total_time = time.time() - start_time
            logger.info(f"⏱️ Total Processing Time: {total_time:.2f}s")
            return results

        known_embeddings = [student['embedding'] for student in students_to_match]
        matched_student_indices = set()
        
        recognition_start = time.time()
        faces_processed = 0

        for face_obj in detected_faces:
            faces_processed += 1
            face_start = time.time()
            facial_area = face_obj.get('facial_area', {})
            try:
                # Enhanced face recognition with multiple validation approaches
                detected_embedding = None
                best_embedding_quality = 0
                
                if ENHANCED_PREPROCESSING:
                    # Try multiple extraction methods for robustness
                    extraction_methods = [
                        {'detector': 'mtcnn', 'align': True, 'normalization': 'Facenet2018'},
                        {'detector': 'retinaface', 'align': True, 'normalization': 'base'},
                        {'detector': 'opencv', 'align': False, 'normalization': 'base'}
                    ]
                    
                    for method in extraction_methods:
                        try:
                            embedding_obj = DeepFace.represent(
                                img_path=face_obj['face'], 
                                model_name=RECOGNITION_MODEL, 
                                enforce_detection=False, 
                                detector_backend='skip',  # Face already detected
                                align=method['align'],
                                normalization=method['normalization']
                            )
                            
                            candidate_embedding = embedding_obj[0]["embedding"]  # type: ignore
                            
                            # Quality check: compute embedding stability/confidence
                            embedding_norm = np.linalg.norm(candidate_embedding)
                            if embedding_norm > best_embedding_quality:
                                detected_embedding = candidate_embedding
                                best_embedding_quality = embedding_norm
                                
                        except Exception as method_e:
                            logger.debug(f"Method {method} failed: {method_e}")
                            continue
                    
                    if detected_embedding is None:
                        logger.warning(f"All enhanced extraction methods failed for a face")
                        continue
                else:
                    # Original method
                    embedding_obj = DeepFace.represent(
                        img_path=face_obj['face'], 
                        model_name=RECOGNITION_MODEL, 
                        enforce_detection=False, 
                        detector_backend='skip'
                    )
                    detected_embedding = embedding_obj[0]["embedding"]  # type: ignore
                    
            except Exception as e:
                logger.warning(f"Could not generate embedding for a detected face: {e}")
                continue

            # Enhanced matching with multiple distance metrics
            min_distance = float('inf')
            best_student_idx = -1
            confidence_scores = []

            for i, known_embedding in enumerate(known_embeddings):
                if i in matched_student_indices:
                    continue
                
                # Multiple distance calculations for robustness
                euclidean_dist = np.linalg.norm(np.array(detected_embedding) - np.array(known_embedding))
                cosine_similarity = np.dot(detected_embedding, known_embedding) / (
                    np.linalg.norm(detected_embedding) * np.linalg.norm(known_embedding)
                )
                cosine_distance = 1 - cosine_similarity
                
                # Weighted combination of distance metrics
                combined_distance = (0.7 * euclidean_dist) + (0.3 * cosine_distance * 20)  # Scale cosine to similar range
                
                if combined_distance < min_distance:
                    min_distance = combined_distance
                    best_student_idx = i
                    
                # Store additional confidence metrics
                confidence_scores.append({
                    'student_idx': i,
                    'euclidean': euclidean_dist,
                    'cosine_sim': cosine_similarity,
                    'combined': combined_distance
                })
            
            if best_student_idx != -1:
                logger.debug(f"🎯 Best match: '{students_to_match[best_student_idx]['name']}' distance={min_distance:.4f}")

            # Enhanced confidence calculation with stricter thresholds
            if best_student_idx != -1 and min_distance < DISTANCE_THRESHOLD:
                matched_student = students_to_match[best_student_idx]
                
                # Multi-factor confidence calculation
                base_confidence = float(max(0, 1 - (min_distance / DISTANCE_THRESHOLD)))
                
                # Find the correct confidence score entry for the best match
                best_confidence_entry = None
                for conf in confidence_scores:
                    if conf['student_idx'] == best_student_idx:
                        best_confidence_entry = conf
                        break
                
                # Additional confidence factors
                cosine_sim = best_confidence_entry['cosine_sim'] if best_confidence_entry else 0.0
                cosine_confidence = max(0, cosine_sim)  # Cosine similarity (0 to 1)
                
                # Combined confidence (weighted average)
                final_confidence = (0.6 * base_confidence) + (0.4 * cosine_confidence)
                
                # Apply minimum confidence threshold
                if final_confidence >= MIN_CONFIDENCE_THRESHOLD:
                    results["identified_students"].append({
                        'student_id': matched_student['id'],
                        'name': matched_student['name'],
                        'roll_no': matched_student['roll_no'],
                        'class_id': matched_student['class_id'],
                        'confidence': float(final_confidence),
                        'facial_area': facial_area,
                        'euclidean_distance': float(min_distance),
                        'cosine_similarity': float(cosine_sim)
                    })
                    matched_student_indices.add(best_student_idx)
                    logger.debug(f"✅ MATCH: {matched_student['name']} (confidence: {final_confidence:.3f}, euclidean: {min_distance:.2f}, cosine: {cosine_sim:.3f})")
                else:
                    results["unidentified_faces_count"] += 1
                    logger.debug(f"❌ REJECTED: {matched_student['name']} - confidence too low ({final_confidence:.3f} < {MIN_CONFIDENCE_THRESHOLD})")
            else:
                results["unidentified_faces_count"] += 1
                if best_student_idx != -1:
                    logger.debug(f"❌ REJECTED: Distance too high ({min_distance:.2f} >= {DISTANCE_THRESHOLD})")
                else:
                    logger.debug(f"❌ NO MATCH: No suitable candidate found")
            
            # Log timing for this face
            face_time = time.time() - face_start
            logger.debug(f"⏱️ Face {faces_processed} processed in {face_time:.3f}s")
        
        # Summary log instead of detailed per-face logs
        recognition_time = time.time() - recognition_start
        total_time = time.time() - start_time
        
        identified_count = len(results["identified_students"])
        total_faces = results["total_faces_detected"]
        unidentified_count = results["unidentified_faces_count"]
        
        logger.info(f"⏱️ Face Recognition: {recognition_time:.2f}s - Processed {faces_processed} faces")
        logger.info(f"⏱️ Total Processing Time: {total_time:.2f}s")
        logger.info(f"🎯 Face Recognition Summary: {identified_count}/{total_faces} faces identified, {unidentified_count} unidentified")
        if identified_count > 0:
            identified_names = [student['name'] for student in results["identified_students"]]
            logger.info(f"✅ Identified students: {', '.join(identified_names)}")
                
        return results


# Backward compatibility alias
FaceRecognizer = ClassBasedFaceRecognizer
