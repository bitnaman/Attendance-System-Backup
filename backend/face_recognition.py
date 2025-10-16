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

# Configure TensorFlow GPU BEFORE any TensorFlow/DeepFace imports
try:
    import tensorflow as tf
    import os
    
    # Get COMPUTE_MODE from environment
    COMPUTE_MODE_SETTING = os.getenv("COMPUTE_MODE", "auto").lower()
    if COMPUTE_MODE_SETTING not in ["auto", "gpu", "cpu"]:
        COMPUTE_MODE_SETTING = "auto"
    
    # Check COMPUTE_MODE setting
    if COMPUTE_MODE_SETTING == "cpu":
        # Force CPU mode
        tf.config.set_visible_devices([], 'GPU')
        print("🖥️ COMPUTE_MODE=cpu - GPU disabled, using CPU only")
    elif COMPUTE_MODE_SETTING == "gpu":
        # Force GPU mode - will fail if GPU not available
        gpus = tf.config.list_physical_devices('GPU')
        if not gpus:
            raise RuntimeError("COMPUTE_MODE=gpu but no GPU devices found!")
        # Enable memory growth for GPUs
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"🚀 COMPUTE_MODE=gpu - Forcing GPU mode ({len(gpus)} GPU(s) available)")
    else:  # auto mode
        # Auto-detect: enable GPU if available, fallback to CPU
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            try:
                # Enable memory growth BEFORE GPU initialization
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                print(f"⚡ COMPUTE_MODE=auto - GPU detected, using {len(gpus)} GPU(s)")
            except RuntimeError as e:
                print(f"⚠️ COMPUTE_MODE=auto - GPU setup failed: {e}, falling back to CPU")
        else:
            print("🖥️ COMPUTE_MODE=auto - No GPU detected, using CPU")
    
    # Set log level to reduce clutter
    tf.get_logger().setLevel('ERROR')
    
except Exception as e:
    print(f"⚠️ TensorFlow configuration error: {e}")

from deepface import DeepFace
from utils.logging_utils import create_throttled_logger
from config import (
    LOG_THROTTLE_MS, FACE_RECOGNITION_MODEL, FACE_DETECTOR_BACKEND, 
    FACE_DISTANCE_THRESHOLD, MODEL_CONFIGS, COMPUTE_MODE, ADAPTIVE_THRESHOLD_MODE
)

# --- Enhanced Configuration Constants for Better Accuracy ---
RECOGNITION_MODEL = FACE_RECOGNITION_MODEL  # Now configurable via config.py
DETECTOR_BACKEND = FACE_DETECTOR_BACKEND    # Now configurable via config.py  
DISTANCE_THRESHOLD = FACE_DISTANCE_THRESHOLD  # Now configurable via config.py
MIN_CONFIDENCE_THRESHOLD = 0.10   # Minimum confidence to consider a match (10%)
ENHANCED_PREPROCESSING = True      # Enable enhanced image preprocessing

# 🚀 GROUP PHOTO OPTIMIZATION SETTINGS
ENABLE_ADAPTIVE_THRESHOLD = (ADAPTIVE_THRESHOLD_MODE == "enabled")  # Controlled by .env file
ENABLE_MULTI_DETECTOR = True       # Use multiple detectors for better coverage
ENABLE_QUALITY_ASSESSMENT = True   # Filter and prioritize high-quality faces
MIN_FACE_SIZE = 30                 # Minimum face size in pixels
MIN_FACE_QUALITY_SCORE = 0.3       # Minimum quality score (0-1)

# Adaptive threshold configuration
THRESHOLD_SINGLE_PHOTO = DISTANCE_THRESHOLD      # Strict for 1-2 faces
THRESHOLD_SMALL_GROUP = DISTANCE_THRESHOLD + 4   # Moderate for 3-10 faces
THRESHOLD_LARGE_GROUP = DISTANCE_THRESHOLD + 8   # Relaxed for 11+ faces

# Multi-detector fallback order (best to most forgiving)
DETECTOR_CASCADE = ['mtcnn', 'retinaface', 'mediapipe', 'opencv']

# Get model-specific configuration
MODEL_CONFIG = MODEL_CONFIGS.get(RECOGNITION_MODEL, {"threshold": 20.0, "embedding_size": 512})

# Determine if user explicitly set threshold in .env vs using system default
import os
ENV_THRESHOLD_EXPLICIT = os.getenv("FACE_DISTANCE_THRESHOLD") is not None
MODEL_DEFAULT_THRESHOLD = MODEL_CONFIG["threshold"]

if ENV_THRESHOLD_EXPLICIT:
    # User explicitly set threshold in .env file - always respect this
    EFFECTIVE_THRESHOLD = FACE_DISTANCE_THRESHOLD
    THRESHOLD_SOURCE = f".env (explicit: {FACE_DISTANCE_THRESHOLD})"
    IS_CUSTOM_THRESHOLD = True
else:
    # No explicit .env setting, use model-specific optimal threshold
    EFFECTIVE_THRESHOLD = MODEL_DEFAULT_THRESHOLD  
    THRESHOLD_SOURCE = f"model default ({MODEL_DEFAULT_THRESHOLD})"
    IS_CUSTOM_THRESHOLD = False

# Update DISTANCE_THRESHOLD to the effective value
DISTANCE_THRESHOLD = EFFECTIVE_THRESHOLD

# Create throttled logger for face recognition
logger = create_throttled_logger(__name__, LOG_THROTTLE_MS)


# 🎯 Helper Functions for Face Quality Assessment
def calculate_face_quality_score(face_image: np.ndarray, facial_area: dict) -> float:
    """
    Calculate comprehensive quality score for a detected face.
    Returns score between 0-1 (higher is better)
    """
    try:
        # Convert to grayscale for analysis
        if len(face_image.shape) == 3:
            gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
        else:
            gray = face_image
        
        # 1. Sharpness Score (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_score = min(laplacian_var / 500.0, 1.0)  # Normalize to 0-1
        
        # 2. Size Score (face area)
        face_width = facial_area.get('w', 0)
        face_height = facial_area.get('h', 0)
        face_area_pixels = face_width * face_height
        size_score = min(face_area_pixels / 10000.0, 1.0)  # Normalize (100x100 = good)
        
        # 3. Brightness Score (mean luminance)
        mean_brightness = np.mean(gray)
        # Optimal brightness around 100-150
        brightness_score = 1.0 - abs(mean_brightness - 125) / 125.0
        brightness_score = max(0, brightness_score)
        
        # 4. Contrast Score (standard deviation)
        contrast = np.std(gray)
        contrast_score = min(contrast / 50.0, 1.0)  # Normalize
        
        # Combined quality score (weighted average)
        quality_score = (
            sharpness_score * 0.35 +
            size_score * 0.30 +
            brightness_score * 0.20 +
            contrast_score * 0.15
        )
        
        return quality_score
    except Exception as e:
        logger.debug(f"Quality assessment failed: {e}")
        return 0.5  # Default moderate quality


def get_adaptive_threshold(num_faces: int, face_quality: float, base_threshold: float) -> float:
    """
    Calculate adaptive threshold based on photo complexity and face quality.
    
    Args:
        num_faces: Number of faces detected in photo
        face_quality: Quality score of the face (0-1)
        base_threshold: Base threshold from config
    
    Returns:
        Adjusted threshold value
    """
    if not ENABLE_ADAPTIVE_THRESHOLD:
        return base_threshold
    
    # Start with scenario-based threshold
    if num_faces <= 2:
        scenario_threshold = THRESHOLD_SINGLE_PHOTO
    elif num_faces <= 10:
        scenario_threshold = THRESHOLD_SMALL_GROUP
    else:
        scenario_threshold = THRESHOLD_LARGE_GROUP
    
    # Adjust based on face quality
    if ENABLE_QUALITY_ASSESSMENT:
        if face_quality >= 0.7:
            # High quality - can use stricter threshold
            quality_adjustment = -2.0
        elif face_quality >= 0.5:
            # Medium quality - use scenario threshold as-is
            quality_adjustment = 0
        else:
            # Low quality - relax threshold further
            quality_adjustment = 3.0
        
        final_threshold = scenario_threshold + quality_adjustment
    else:
        final_threshold = scenario_threshold
    
    # Ensure reasonable bounds
    final_threshold = max(base_threshold - 2, min(final_threshold, base_threshold + 12))
    
    return final_threshold


def enhance_face_image(face_image: np.ndarray) -> np.ndarray:
    """
    Apply preprocessing to improve face image quality.
    
    Args:
        face_image: Input face image (RGB or grayscale)
    
    Returns:
        Enhanced face image
    """
    try:
        # Convert to RGB if needed
        if len(face_image.shape) == 2:
            face_rgb = cv2.cvtColor(face_image, cv2.COLOR_GRAY2RGB)
        else:
            face_rgb = face_image.copy()
        
        # 1. Histogram Equalization (in YCrCb space to preserve color)
        ycrcb = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2YCrCb)
        ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
        face_rgb = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2RGB)
        
        # 2. Adaptive Sharpening
        gaussian = cv2.GaussianBlur(face_rgb, (0, 0), 2.0)
        face_rgb = cv2.addWeighted(face_rgb, 1.5, gaussian, -0.5, 0)
        
        # 3. Denoise (mild to preserve details)
        face_rgb = cv2.fastNlMeansDenoisingColored(face_rgb, None, 10, 10, 7, 21)
        
        # 4. Normalize to [0, 255] range
        face_rgb = np.clip(face_rgb, 0, 255).astype(np.uint8)
        
        return face_rgb
    except Exception as e:
        logger.debug(f"Face enhancement failed: {e}")
        return face_image  # Return original if enhancement fails



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
            logger.info(f"🏗️ Building {RECOGNITION_MODEL} model...")
            DeepFace.build_model(RECOGNITION_MODEL)
            
            # Log detailed model configuration
            logger.info(f"✅ {RECOGNITION_MODEL} model built successfully!")
            logger.info(f"📊 Model Details:")
            logger.info(f"   🧠 Architecture: {RECOGNITION_MODEL}")
            logger.info(f"   👁️ Detector Backend: {DETECTOR_BACKEND}")
            logger.info(f"   📏 Distance Threshold: {DISTANCE_THRESHOLD} ({THRESHOLD_SOURCE})")
            logger.info(f"   🎯 Adaptive Threshold: {'✅ ENABLED (auto-adjusts for groups)' if ENABLE_ADAPTIVE_THRESHOLD else '🔒 DISABLED (fixed threshold)'}")
            logger.info(f"   🎯 Min Confidence: {MIN_CONFIDENCE_THRESHOLD}")
            logger.info(f"   🔧 Enhanced Preprocessing: {'✅ Enabled' if ENHANCED_PREPROCESSING else '❌ Disabled'}")
            
            # Log model-specific configuration
            if RECOGNITION_MODEL in MODEL_CONFIGS:
                config = MODEL_CONFIGS[RECOGNITION_MODEL]
                logger.info(f"   ⚙️ Embedding Dimensions: {config['embedding_size']}d")
                logger.info(f"   🎚️ Model Default Threshold: {config['threshold']}")
                
                # Show if threshold is customized
                if IS_CUSTOM_THRESHOLD:
                    logger.info(f"   🔄 Using explicit .env threshold: {DISTANCE_THRESHOLD} (model default: {config['threshold']})")
                else:
                    logger.info(f"   ✅ Using model default threshold: {DISTANCE_THRESHOLD}")
            
        except Exception as e:
            logger.error(f"❌ Failed to build face recognition model: {e}")
            raise

    def _check_tensorflow_setup(self):
        """
        Check TensorFlow installation and GPU availability based on COMPUTE_MODE.
        """
        try:
            import tensorflow as tf
            self.tf_version = tf.__version__
            logger.info(f"🔧 TENSORFLOW SETUP")
            logger.info(f"   📦 Version: {self.tf_version}")
            logger.info(f"   ⚙️ Compute Mode: {COMPUTE_MODE.upper()}")
            
            # Check actual GPU availability
            gpus = tf.config.list_physical_devices('GPU')
            gpu_count = len(gpus)
            
            # Determine if GPU should be used based on COMPUTE_MODE
            if COMPUTE_MODE == "cpu":
                # CPU mode forced
                self.gpu_available = False
                logger.info(f"   🖥️ Mode: CPU ONLY (forced)")
                logger.info(f"   💡 GPU detection: {gpu_count} GPU(s) available but not used")
                
            elif COMPUTE_MODE == "gpu":
                # GPU mode forced
                if gpu_count > 0:
                    self.gpu_available = True
                    logger.info(f"   🚀 GPU Acceleration: ✅ ENABLED (forced)")
                    logger.info(f"   🎮 GPU Count: {gpu_count}")
                    for i, gpu in enumerate(gpus):
                        logger.info(f"      GPU {i}: {gpu.name}")
                    
                    # Test GPU computation
                    try:
                        with tf.device('/GPU:0'):
                            test_tensor = tf.constant([1.0, 2.0, 3.0])
                            test_result = tf.reduce_sum(test_tensor)
                        logger.info(f"   ✅ GPU Test: PASSED ({test_result.numpy()})")
                    except Exception as gpu_error:
                        logger.warning(f"   ⚠️ GPU Test: FAILED - {gpu_error}")
                        logger.info(f"   ℹ️ GPU is still available despite test failure")
                else:
                    # GPU forced but not available - this is an error
                    self.gpu_available = False
                    logger.error(f"   ❌ COMPUTE_MODE=gpu but no GPU available!")
                    logger.error(f"   💡 Tip: Change COMPUTE_MODE to 'auto' or 'cpu' in .env")
                    
            else:  # auto mode
                # Auto-detect
                if gpu_count > 0:
                    self.gpu_available = True
                    logger.info(f"   🚀 GPU Acceleration: ✅ ENABLED (auto-detected)")
                    logger.info(f"   🎮 GPU Count: {gpu_count}")
                    for i, gpu in enumerate(gpus):
                        logger.info(f"      GPU {i}: {gpu.name}")
                    
                    # Test GPU computation
                    try:
                        with tf.device('/GPU:0'):
                            test_tensor = tf.constant([1.0, 2.0, 3.0])
                            test_result = tf.reduce_sum(test_tensor)
                        logger.info(f"   ✅ GPU Test: PASSED ({test_result.numpy()})")
                    except Exception as gpu_error:
                        logger.warning(f"   ⚠️ GPU Test: FAILED - {gpu_error}")
                        logger.info(f"   ℹ️ GPU is still available despite test failure")
                else:
                    self.gpu_available = False
                    logger.info(f"   🖥️ Compute Mode: CPU only (no GPU detected)")
            # Show GPU performance tips only for auto mode with no GPU
            if COMPUTE_MODE == "auto" and not self.gpu_available:
                logger.info(f"   💡 GPU Performance Tips:")
                logger.info(f"      • Install NVIDIA GPU with CUDA support")
                logger.info(f"      • Install: pip install tensorflow[and-cuda]")
                logger.info(f"      • Or set COMPUTE_MODE=cpu in .env to suppress this message")
                
        except ImportError:
            logger.error("❌ TensorFlow not found! Install with: pip install tensorflow[and-cuda]")
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
                            # Multiple embeddings detected - use enhanced averaging (same as registration)
                            if len(embedding) > 1:
                                # Apply same outlier detection and quality assessment as registration
                                def enhanced_embedding_averaging(embeddings):
                                    """Apply enhanced averaging with outlier detection"""
                                    # Simple outlier detection for loading (lighter than registration)
                                    mean_emb = np.mean(embeddings, axis=0)
                                    distances = [np.linalg.norm(emb - mean_emb) for emb in embeddings]
                                    threshold = np.mean(distances) + 2 * np.std(distances)
                                    
                                    # Keep embeddings within threshold
                                    filtered_embeddings = [emb for i, emb in enumerate(embeddings) 
                                                         if distances[i] <= threshold]
                                    
                                    if not filtered_embeddings:
                                        filtered_embeddings = [embeddings[0]]  # Keep at least one
                                    
                                    # Enhanced quality scoring
                                    if len(filtered_embeddings) > 1:
                                        filtered_mean = np.mean(filtered_embeddings, axis=0)
                                        quality_scores = []
                                        
                                        for emb in filtered_embeddings:
                                            consistency_score = 1.0 / (1.0 + np.linalg.norm(emb - filtered_mean))
                                            magnitude_score = 1.0 / (1.0 + abs(np.linalg.norm(emb) - np.linalg.norm(filtered_mean)))
                                            combined_quality = (consistency_score * 0.7) + (magnitude_score * 0.3)
                                            quality_scores.append(combined_quality)
                                        
                                        # Exponential weighting for high-quality embeddings
                                        quality_weights = np.exp(np.array(quality_scores) * 2.0)
                                        quality_weights = quality_weights / np.sum(quality_weights)
                                        
                                        return np.average(filtered_embeddings, axis=0, weights=quality_weights)
                                    else:
                                        return filtered_embeddings[0]
                                
                                embedding = enhanced_embedding_averaging(embedding)
                                logger.debug(f"🎯 Enhanced averaging for {student.name}: {len(embedding)} -> 1 optimized embedding")
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

            # Enhanced averaging with outlier detection and advanced quality assessment
            if len(all_embeddings) > 1:
                stacked = np.stack(all_embeddings, axis=0)
                
                # Step 1: Outlier Detection using IQR method
                def detect_outliers(embeddings):
                    """Detect outlier embeddings using statistical methods"""
                    pairwise_distances = []
                    for i, emb1 in enumerate(embeddings):
                        for j, emb2 in enumerate(embeddings):
                            if i != j:
                                pairwise_distances.append(np.linalg.norm(emb1 - emb2))
                    
                    if len(pairwise_distances) == 0:
                        return np.arange(len(embeddings))  # Keep all if only one embedding
                    
                    # Calculate IQR for outlier detection
                    q1, q3 = np.percentile(pairwise_distances, [25, 75])
                    iqr = q3 - q1
                    outlier_threshold = q3 + 1.5 * iqr
                    
                    # Find embeddings that are not outliers
                    non_outliers = []
                    for i, emb in enumerate(embeddings):
                        distances_to_others = [np.linalg.norm(emb - other) for j, other in enumerate(embeddings) if i != j]
                        avg_distance = np.mean(distances_to_others) if distances_to_others else 0
                        if avg_distance <= outlier_threshold:
                            non_outliers.append(i)
                    
                    return non_outliers if non_outliers else [0]  # Keep at least one embedding
                
                # Remove outliers
                valid_indices = detect_outliers(all_embeddings)
                filtered_embeddings = [all_embeddings[i] for i in valid_indices]
                filtered_stacked = np.stack(filtered_embeddings, axis=0)
                
                logger.info(f"🧹 Outlier detection: kept {len(filtered_embeddings)}/{len(all_embeddings)} embeddings")
                
                # Step 2: Advanced Quality Scoring
                mean_embedding = np.mean(filtered_stacked, axis=0)
                quality_scores = []
                
                for emb in filtered_embeddings:
                    # Multi-factor quality assessment
                    consistency_score = 1.0 / (1.0 + np.linalg.norm(emb - mean_embedding))
                    magnitude_score = 1.0 / (1.0 + abs(np.linalg.norm(emb) - np.linalg.norm(mean_embedding)))
                    
                    # Combined quality score
                    combined_quality = (consistency_score * 0.7) + (magnitude_score * 0.3)
                    quality_scores.append(combined_quality)
                
                # Step 3: Enhanced Weighted Averaging
                quality_scores = np.array(quality_scores)
                
                # Apply exponential emphasis to high-quality embeddings
                quality_weights = np.exp(quality_scores * 2.0)  # Exponential weighting
                quality_weights = quality_weights / np.sum(quality_weights)
                
                # Final weighted average
                final_embedding = np.average(filtered_stacked, axis=0, weights=quality_weights)
                
                logger.info(f"📊 Enhanced averaging: {len(filtered_embeddings)} embeddings")
                logger.info(f"🎯 Quality weights: {quality_weights}")
                logger.info(f"⚡ Final embedding norm: {np.linalg.norm(final_embedding):.3f}")
                
                # Save both individual embeddings and metadata
                np.save(embedding_path, filtered_stacked)  # Keep filtered embeddings
            else:
                # Single embedding case
                stacked = np.stack(all_embeddings, axis=0)
                np.save(embedding_path, stacked)
                logger.info(f"💾 Saved single high-quality embedding to {embedding_path}")
                
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
        detected_faces = []
        
        # 🚀 MULTI-DETECTOR CASCADE for better coverage in group photos
        if ENABLE_MULTI_DETECTOR:
            logger.info(f"🔍 Using multi-detector cascade: {DETECTOR_CASCADE}")
            
            for detector in DETECTOR_CASCADE:
                try:
                    faces = DeepFace.extract_faces(
                        img_path=image_path,
                        detector_backend=detector,
                        enforce_detection=False
                    )
                    
                    if faces:
                        detected_faces = faces
                        logger.info(f"✅ Detector '{detector}' found {len(faces)} faces")
                        break  # Use first successful detector
                    else:
                        logger.debug(f"⚠️ Detector '{detector}' found no faces, trying next...")
                        
                except Exception as e:
                    logger.debug(f"❌ Detector '{detector}' failed: {e}")
                    continue
            
            if not detected_faces:
                logger.warning("⚠️ All detectors failed to find faces")
        else:
            # Original single detector method
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
        num_faces = len(detected_faces)
        logger.info(f"⏱️ Face Detection: {face_detection_time:.2f}s - Found {num_faces} faces")
        
        # 🎯 Log adaptive threshold strategy
        if ENABLE_ADAPTIVE_THRESHOLD:
            if num_faces <= 2:
                logger.info(f"📊 Photo type: SINGLE/PAIR - Using strict threshold")
            elif num_faces <= 10:
                logger.info(f"📊 Photo type: SMALL GROUP - Using moderate threshold")
            else:
                logger.info(f"📊 Photo type: LARGE GROUP - Using relaxed threshold")


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
            face_image = face_obj.get('face')
            
            # 🎯 QUALITY ASSESSMENT
            face_quality = 0.5  # Default moderate quality
            if ENABLE_QUALITY_ASSESSMENT and face_image is not None:
                face_quality = calculate_face_quality_score(face_image, facial_area)
                logger.debug(f"Face {faces_processed} quality score: {face_quality:.2f}")
                
                # Skip very low quality faces
                if face_quality < MIN_FACE_QUALITY_SCORE:
                    logger.info(f"⚠️ Face {faces_processed} rejected (quality {face_quality:.2f} < {MIN_FACE_QUALITY_SCORE})")
                    results['unidentified_faces_count'] += 1
                    continue
                
                # Apply face enhancement for low-medium quality faces
                if face_quality < 0.7:
                    logger.debug(f"🔧 Enhancing face {faces_processed} (quality: {face_quality:.2f})")
                    face_image = enhance_face_image(face_image)
            
            # Check minimum face size
            face_width = facial_area.get('w', 0)
            face_height = facial_area.get('h', 0)
            if face_width < MIN_FACE_SIZE or face_height < MIN_FACE_SIZE:
                logger.info(f"⚠️ Face {faces_processed} too small ({face_width}x{face_height} < {MIN_FACE_SIZE}px)")
                results['unidentified_faces_count'] += 1
                continue
            
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
                            # Use enhanced face image if available
                            input_image = face_image if face_image is not None else face_obj['face']
                            
                            embedding_obj = DeepFace.represent(
                                img_path=input_image, 
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
                        logger.warning(f"All enhanced extraction methods failed for face {faces_processed}")
                        results['unidentified_faces_count'] += 1
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
                logger.warning(f"Could not generate embedding for face {faces_processed}: {e}")
                results['unidentified_faces_count'] += 1
                continue

            # 🎯 ADAPTIVE THRESHOLD based on photo complexity and face quality
            adaptive_threshold = get_adaptive_threshold(num_faces, face_quality, DISTANCE_THRESHOLD)
            logger.debug(f"Face {faces_processed}: threshold={adaptive_threshold:.1f} (quality={face_quality:.2f})")

            # Enhanced matching with multiple distance metrics
            min_distance = float('inf')
            best_student_idx = -1
            second_best_distance = float('inf')
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
                    second_best_distance = min_distance  # Track second-best for ambiguity detection
                    min_distance = combined_distance
                    best_student_idx = i
                elif combined_distance < second_best_distance:
                    second_best_distance = combined_distance
                    
                # Store additional confidence metrics
                confidence_scores.append({
                    'student_idx': i,
                    'euclidean': euclidean_dist,
                    'cosine_sim': cosine_similarity,
                    'combined': combined_distance
                })
            
            # 🎯 ENHANCED MATCHING DECISION with adaptive threshold
            if best_student_idx != -1:
                matched_student = students_to_match[best_student_idx]
                
                # Calculate match confidence
                base_confidence = float(max(0, 1 - (min_distance / adaptive_threshold)))
                
                # Find cosine similarity for best match
                best_confidence_entry = next(
                    (conf for conf in confidence_scores if conf['student_idx'] == best_student_idx),
                    None
                )
                cosine_sim = best_confidence_entry['cosine_sim'] if best_confidence_entry else 0.0
                cosine_confidence = max(0, cosine_sim)
                
                # Combined confidence (weighted average)
                final_confidence = (0.6 * base_confidence) + (0.4 * cosine_confidence)
                
                # ⚠️ AMBIGUITY DETECTION: Check if match is clearly the best
                ambiguity_margin = second_best_distance - min_distance
                is_ambiguous = ambiguity_margin < 3.0  # Require reasonable separation
                
                # Quality-adjusted confidence
                quality_adjusted_confidence = final_confidence * (0.7 + 0.3 * face_quality)
                
                # DECISION LOGIC
                match_accepted = False
                match_reason = ""
                
                if min_distance < adaptive_threshold:
                    if is_ambiguous:
                        # Ambiguous match - require higher confidence
                        if quality_adjusted_confidence >= 0.7:
                            match_accepted = True
                            match_reason = f"ambiguous match (margin={ambiguity_margin:.1f}) but high confidence"
                        else:
                            match_reason = f"rejected due to ambiguity (margin={ambiguity_margin:.1f}, conf={quality_adjusted_confidence:.2f})"
                    else:
                        # Clear winner
                        match_accepted = True
                        match_reason = f"clear match (margin={ambiguity_margin:.1f})"
                else:
                    match_reason = f"distance {min_distance:.1f} > threshold {adaptive_threshold:.1f}"
                
                logger.debug(f"🎯 Best match: '{matched_student['name']}' - {match_reason}")
                
                if match_accepted:
                    # Apply minimum confidence threshold
                    if quality_adjusted_confidence >= MIN_CONFIDENCE_THRESHOLD:
                        results["identified_students"].append({
                            'student_id': matched_student['id'],
                            'name': matched_student['name'],
                            'roll_no': matched_student['roll_no'],
                            'class_id': matched_student['class_id'],
                            'confidence': float(quality_adjusted_confidence),
                            'facial_area': facial_area,
                            'euclidean_distance': float(min_distance),
                            'cosine_similarity': float(cosine_sim),
                            'face_quality': float(face_quality),
                            'threshold_used': float(adaptive_threshold)
                        })
                        matched_student_indices.add(best_student_idx)
                        logger.info(f"✅ MATCH #{faces_processed}: {matched_student['name']} "
                                  f"(conf: {quality_adjusted_confidence:.2f}, dist: {min_distance:.1f}, "
                                  f"quality: {face_quality:.2f}, threshold: {adaptive_threshold:.1f})")
                    else:
                        results["unidentified_faces_count"] += 1
                        logger.debug(f"❌ REJECTED: {matched_student['name']} - confidence too low "
                                   f"({quality_adjusted_confidence:.3f} < {MIN_CONFIDENCE_THRESHOLD})")
                else:
                    results["unidentified_faces_count"] += 1
                    logger.debug(f"❌ REJECTED: {match_reason}")
            else:
                results["unidentified_faces_count"] += 1
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
        
        # Calculate accuracy metrics
        if total_faces > 0:
            accuracy_rate = (identified_count / total_faces) * 100
        else:
            accuracy_rate = 0
        
        logger.info(f"⏱️ Face Recognition: {recognition_time:.2f}s - Processed {faces_processed} faces")
        logger.info(f"⏱️ Total Processing Time: {total_time:.2f}s")
        logger.info(f"📊 RECOGNITION SUMMARY:")
        logger.info(f"   ✅ Identified: {identified_count}/{total_faces} ({accuracy_rate:.1f}%)")
        logger.info(f"   ❌ Unidentified: {unidentified_count}")
        logger.info(f"   🎯 Adaptive Threshold: {'Enabled' if ENABLE_ADAPTIVE_THRESHOLD else 'Disabled'}")
        logger.info(f"   🔍 Multi-Detector: {'Enabled' if ENABLE_MULTI_DETECTOR else 'Disabled'}")
        logger.info(f"   ⭐ Quality Filter: {'Enabled' if ENABLE_QUALITY_ASSESSMENT else 'Disabled'}")
        
        if identified_count > 0:
            identified_names = [student['name'] for student in results["identified_students"]]
            avg_confidence = sum(s['confidence'] for s in results["identified_students"]) / identified_count
            avg_quality = sum(s.get('face_quality', 0.5) for s in results["identified_students"]) / identified_count
            logger.info(f"   📝 Students: {', '.join(identified_names)}")
            logger.info(f"   📈 Avg Confidence: {avg_confidence:.2f}")
            logger.info(f"   ⭐ Avg Face Quality: {avg_quality:.2f}")
                
        return results


# Backward compatibility alias
FaceRecognizer = ClassBasedFaceRecognizer
