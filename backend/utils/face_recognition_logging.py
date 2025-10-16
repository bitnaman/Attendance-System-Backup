"""
Face Recognition Logging Utilities
Centralized logging formatters for face recognition operations to improve code readability.
"""

import logging
from typing import Dict, List, Any, Optional


def log_model_configuration(
    logger: logging.Logger,
    model_name: str,
    detector_backend: str,
    distance_threshold: float,
    threshold_source: str,
    adaptive_enabled: bool,
    min_confidence: float,
    enhanced_preprocessing: bool,
    model_config: Optional[Dict[str, Any]] = None,
    is_custom_threshold: bool = False
) -> None:
    """
    Log comprehensive model configuration details.
    
    Args:
        logger: Logger instance to use
        model_name: Name of the face recognition model
        detector_backend: Face detector backend in use
        distance_threshold: Current distance threshold
        threshold_source: Source of threshold (env/model default)
        adaptive_enabled: Whether adaptive thresholding is enabled
        min_confidence: Minimum confidence threshold
        enhanced_preprocessing: Whether enhanced preprocessing is enabled
        model_config: Model-specific configuration dict
        is_custom_threshold: Whether threshold was explicitly set in .env
    """
    logger.info(f"📊 Model Details:")
    logger.info(f"   🧠 Architecture: {model_name}")
    logger.info(f"   👁️ Detector Backend: {detector_backend}")
    logger.info(f"   📏 Distance Threshold: {distance_threshold} ({threshold_source})")
    logger.info(f"   🎯 Adaptive Threshold: {'✅ ENABLED (auto-adjusts for groups)' if adaptive_enabled else '🔒 DISABLED (fixed threshold)'}")
    logger.info(f"   🎯 Min Confidence: {min_confidence}")
    logger.info(f"   🔧 Enhanced Preprocessing: {'✅ Enabled' if enhanced_preprocessing else '❌ Disabled'}")
    
    # Log model-specific configuration if available
    if model_config:
        logger.info(f"   ⚙️ Embedding Dimensions: {model_config.get('embedding_size', 'unknown')}d")
        logger.info(f"   🎚️ Model Default Threshold: {model_config.get('threshold', 'unknown')}")
        
        # Show if threshold is customized
        if is_custom_threshold:
            logger.info(f"   🔄 Using explicit .env threshold: {distance_threshold} (model default: {model_config.get('threshold', 'unknown')})")
        else:
            logger.info(f"   ✅ Using model default threshold: {distance_threshold}")


def log_tensorflow_setup(
    logger: logging.Logger,
    tf_version: str,
    compute_mode: str,
    gpu_available: bool,
    gpu_count: int = 0,
    gpu_names: Optional[List[str]] = None,
    gpu_test_result: Optional[float] = None
) -> None:
    """
    Log TensorFlow setup and GPU configuration.
    
    Args:
        logger: Logger instance to use
        tf_version: TensorFlow version string
        compute_mode: Compute mode (auto/gpu/cpu)
        gpu_available: Whether GPU is available and enabled
        gpu_count: Number of GPUs detected
        gpu_names: List of GPU device names
        gpu_test_result: Result of GPU test computation (if available)
    """
    logger.info(f"🔧 TENSORFLOW SETUP")
    logger.info(f"   📦 Version: {tf_version}")
    logger.info(f"   ⚙️ Compute Mode: {compute_mode.upper()}")
    
    if compute_mode == "cpu":
        logger.info(f"   🖥️ Mode: CPU ONLY (forced)")
        if gpu_count > 0:
            logger.info(f"   💡 GPU detection: {gpu_count} GPU(s) available but not used")
    elif compute_mode == "gpu":
        if gpu_available and gpu_count > 0:
            logger.info(f"   🚀 GPU Acceleration: ✅ ENABLED (forced)")
            logger.info(f"   🎮 GPU Count: {gpu_count}")
            if gpu_names:
                for i, name in enumerate(gpu_names):
                    logger.info(f"      GPU {i}: {name}")
            if gpu_test_result is not None:
                logger.info(f"   ✅ GPU Test: PASSED ({gpu_test_result})")
        else:
            logger.error(f"   ❌ COMPUTE_MODE=gpu but no GPU available!")
            logger.error(f"   💡 Tip: Change COMPUTE_MODE to 'auto' or 'cpu' in .env")
    else:  # auto mode
        if gpu_available and gpu_count > 0:
            logger.info(f"   🚀 GPU Acceleration: ✅ ENABLED (auto-detected)")
            logger.info(f"   🎮 GPU Count: {gpu_count}")
            if gpu_names:
                for i, name in enumerate(gpu_names):
                    logger.info(f"      GPU {i}: {name}")
            if gpu_test_result is not None:
                logger.info(f"   ✅ GPU Test: PASSED ({gpu_test_result})")
        else:
            logger.info(f"   🖥️ Compute Mode: CPU only (no GPU detected)")
            logger.info(f"   💡 GPU Performance Tips:")
            logger.info(f"      • Install NVIDIA GPU with CUDA support")
            logger.info(f"      • Install: pip install tensorflow[and-cuda]")
            logger.info(f"      • Or set COMPUTE_MODE=cpu in .env to suppress this message")


def log_recognition_summary(
    logger: logging.Logger,
    total_faces: int,
    identified_count: int,
    unidentified_count: int,
    recognition_time: float,
    total_time: float,
    adaptive_enabled: bool,
    multi_detector_enabled: bool,
    quality_filter_enabled: bool,
    identified_students: Optional[List[Dict[str, Any]]] = None
) -> None:
    """
    Log comprehensive recognition summary with timing and statistics.
    
    Args:
        logger: Logger instance to use
        total_faces: Total number of faces detected
        identified_count: Number of successfully identified students
        unidentified_count: Number of unidentified faces
        recognition_time: Time spent on recognition (seconds)
        total_time: Total processing time (seconds)
        adaptive_enabled: Whether adaptive thresholding was used
        multi_detector_enabled: Whether multi-detector cascade was used
        quality_filter_enabled: Whether quality filtering was applied
        identified_students: List of identified student dictionaries (optional)
    """
    # Calculate accuracy
    accuracy_rate = (identified_count / total_faces * 100) if total_faces > 0 else 0
    
    logger.info(f"⏱️ Face Recognition: {recognition_time:.2f}s - Processed {total_faces} faces")
    logger.info(f"⏱️ Total Processing Time: {total_time:.2f}s")
    logger.info(f"📊 RECOGNITION SUMMARY:")
    logger.info(f"   ✅ Identified: {identified_count}/{total_faces} ({accuracy_rate:.1f}%)")
    logger.info(f"   ❌ Unidentified: {unidentified_count}")
    logger.info(f"   🎯 Adaptive Threshold: {'Enabled' if adaptive_enabled else 'Disabled'}")
    logger.info(f"   🔍 Multi-Detector: {'Enabled' if multi_detector_enabled else 'Disabled'}")
    logger.info(f"   ⭐ Quality Filter: {'Enabled' if quality_filter_enabled else 'Disabled'}")
    
    # Log identified students details if provided
    if identified_students and identified_count > 0:
        identified_names = [student['name'] for student in identified_students]
        avg_confidence = sum(s['confidence'] for s in identified_students) / identified_count
        avg_quality = sum(s.get('face_quality', 0.5) for s in identified_students) / identified_count
        
        logger.info(f"   📝 Students: {', '.join(identified_names)}")
        logger.info(f"   📈 Avg Confidence: {avg_confidence:.2f}")
        logger.info(f"   ⭐ Avg Face Quality: {avg_quality:.2f}")


def log_face_match_decision(
    logger: logging.Logger,
    face_number: int,
    match_accepted: bool,
    student_name: Optional[str] = None,
    confidence: Optional[float] = None,
    distance: Optional[float] = None,
    face_quality: Optional[float] = None,
    threshold: Optional[float] = None,
    cosine_similarity: Optional[float] = None,
    reason: Optional[str] = None
) -> None:
    """
    Log individual face matching decision with details.
    
    Args:
        logger: Logger instance to use
        face_number: Face sequence number being processed
        match_accepted: Whether the match was accepted
        student_name: Name of matched student (if matched)
        confidence: Match confidence score (0-1)
        distance: Distance metric value
        face_quality: Face quality score (0-1)
        threshold: Threshold value used for matching
        cosine_similarity: Cosine similarity score
        reason: Explanation for the decision
    """
    if match_accepted and student_name:
        details = []
        if confidence is not None:
            details.append(f"conf: {confidence:.2f}")
        if distance is not None:
            details.append(f"dist: {distance:.1f}")
        if face_quality is not None:
            details.append(f"quality: {face_quality:.2f}")
        if threshold is not None:
            details.append(f"threshold: {threshold:.1f}")
        
        details_str = ", ".join(details) if details else ""
        logger.info(f"✅ MATCH #{face_number}: {student_name} ({details_str})")
    else:
        rejection_reason = reason if reason else "No suitable match found"
        logger.debug(f"❌ REJECTED #{face_number}: {rejection_reason}")


def log_adaptive_threshold_strategy(
    logger: logging.Logger,
    num_faces: int,
    adaptive_enabled: bool
) -> None:
    """
    Log the adaptive threshold strategy based on number of faces.
    
    Args:
        logger: Logger instance to use
        num_faces: Number of faces detected
        adaptive_enabled: Whether adaptive thresholding is enabled
    """
    if not adaptive_enabled:
        return
    
    if num_faces <= 2:
        logger.info(f"📊 Photo type: SINGLE/PAIR - Using strict threshold")
    elif num_faces <= 10:
        logger.info(f"📊 Photo type: SMALL GROUP - Using moderate threshold")
    else:
        logger.info(f"📊 Photo type: LARGE GROUP - Using relaxed threshold")


def log_multi_detector_cascade(
    logger: logging.Logger,
    detectors: List[str],
    successful_detector: Optional[str] = None,
    faces_found: int = 0
) -> None:
    """
    Log multi-detector cascade attempt results.
    
    Args:
        logger: Logger instance to use
        detectors: List of detectors in cascade
        successful_detector: Which detector succeeded (if any)
        faces_found: Number of faces found by successful detector
    """
    logger.info(f"🔍 Using multi-detector cascade: {detectors}")
    
    if successful_detector:
        logger.info(f"✅ Detector '{successful_detector}' found {faces_found} faces")
    else:
        logger.warning("⚠️ All detectors failed to find faces")


def log_face_quality_assessment(
    logger: logging.Logger,
    face_number: int,
    quality_score: float,
    min_quality: float,
    rejected: bool = False,
    enhanced: bool = False
) -> None:
    """
    Log face quality assessment results.
    
    Args:
        logger: Logger instance to use
        face_number: Face sequence number
        quality_score: Calculated quality score (0-1)
        min_quality: Minimum acceptable quality threshold
        rejected: Whether face was rejected due to low quality
        enhanced: Whether face enhancement was applied
    """
    if rejected:
        logger.info(f"⚠️ Face {face_number} rejected (quality {quality_score:.2f} < {min_quality})")
    elif enhanced:
        logger.debug(f"🔧 Enhancing face {face_number} (quality: {quality_score:.2f})")
    else:
        logger.debug(f"Face {face_number} quality score: {quality_score:.2f}")


def log_embedding_generation(
    logger: logging.Logger,
    student_name: str,
    num_images: int,
    valid_images: int,
    num_embeddings_generated: int,
    outliers_removed: int = 0,
    quality_weights: Optional[list] = None
) -> None:
    """
    Log embedding generation process details.
    
    Args:
        logger: Logger instance to use
        student_name: Name of student for whom embedding is generated
        num_images: Total number of images processed
        valid_images: Number of images that produced valid embeddings
        num_embeddings_generated: Final number of embeddings
        outliers_removed: Number of outlier embeddings removed
        quality_weights: Quality weight distribution (if available)
    """
    logger.info(f"✨ Registration success rate: {valid_images}/{num_images} images processed")
    
    if outliers_removed > 0:
        logger.info(f"🧹 Outlier detection: kept {num_embeddings_generated}/{num_embeddings_generated + outliers_removed} embeddings")
    
    if quality_weights:
        logger.info(f"📊 Enhanced averaging: {num_embeddings_generated} embeddings")
        logger.info(f"🎯 Quality weights: {quality_weights}")


def format_student_list(students: List[Dict[str, Any]], max_display: int = 10) -> str:
    """
    Format student list for logging (truncate if too long).
    
    Args:
        students: List of student dictionaries with 'name' key
        max_display: Maximum number of names to display
    
    Returns:
        Formatted string of student names
    """
    names = [s['name'] for s in students]
    
    if len(names) <= max_display:
        return ', '.join(names)
    else:
        displayed = names[:max_display]
        remaining = len(names) - max_display
        return f"{', '.join(displayed)} ... and {remaining} more"
