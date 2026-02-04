# 📊 Facial Attendance System - Technical Analysis Report

**Generated:** February 3, 2026  
**Purpose:** Comprehensive analysis of the current codebase for tech stack, models, pipelines, storage, and hardware configuration.

---

## 📋 Table of Contents

1. [Current Tech Stack & Model Versions](#1-current-tech-stack--model-versions)
2. [Group Photo Pipeline Logic](#2-group-photo-pipeline-logic)
3. [Database & Storage Structure](#3-database--storage-structure)
4. [Hardware Environment & Performance](#4-hardware-environment--performance-bottlenecks)

---

## 1. Current Tech Stack & Model Versions

### 1.1 Face Detection

| Component | Library/Model | Version | Description |
|-----------|---------------|---------|-------------|
| **Primary Detector** | MTCNN | `mtcnn==1.0.0` | Multi-task Cascaded CNN - Default detector backend |
| **Fallback Detector 1** | RetinaFace | `retina-face==0.0.17` | High accuracy for difficult conditions |
| **Fallback Detector 2** | MediaPipe | `mediapipe==0.10.21` | Google's fast face detection |
| **Fallback Detector 3** | OpenCV Haar Cascade | `opencv-python==4.10.0.84` | Fast but basic detection |
| **Detector Backend** | SSD | Built into TensorFlow | Single Shot Detector - Balanced |

**Configuration Source:** [config.py](backend/config.py#L87-L88)
```python
FACE_RECOGNITION_MODEL = os.getenv("FACE_RECOGNITION_MODEL", "ArcFace")
FACE_DETECTOR_BACKEND = os.getenv("FACE_DETECTOR_BACKEND", "mtcnn")
```

**Detector Fallback Sequence** (from `.env`):
```python
DETECTOR_FALLBACK_SEQUENCE = os.getenv("DETECTOR_FALLBACK_SEQUENCE", "mtcnn,retinaface,mediapipe,opencv")
```

### 1.2 Face Recognition/Embedding Models

| Model | Embedding Size | Default Threshold | Status |
|-------|---------------|-------------------|--------|
| **ArcFace** | 512-d | 18.0 | ✅ **PRIMARY (Default)** |
| **Facenet512** | 512-d | 20.0 | Available for ensemble |
| **Facenet** | 128-d | 15.0 | Available for ensemble |
| **GhostFaceNet** | 512-d | 19.0 | Available for ensemble |
| **SFace** | 128-d | 12.0 | Available for ensemble |

**Configuration Source:** [config.py](backend/config.py#L123-L129)
```python
MODEL_CONFIGS = {
    "Facenet512": {"threshold": 20.0, "embedding_size": 512},
    "ArcFace": {"threshold": 18.0, "embedding_size": 512},
    "Facenet": {"threshold": 15.0, "embedding_size": 128},
    "GhostFaceNet": {"threshold": 19.0, "embedding_size": 512},
    "SFace": {"threshold": 12.0, "embedding_size": 128}
}
```

### 1.3 Input Resolutions

| Stage | Resolution | Notes |
|-------|------------|-------|
| **Face Preprocessing** | 224×224 | Target size for preprocessing pipeline |
| **Minimum Face Size** | 112×112 | Faces below this are upscaled via super-resolution |
| **Model Input** | Varies by model | ArcFace: 112×112, Facenet512: 160×160 (handled by DeepFace) |
| **Quality Filter** | ≥30×30 px | `MIN_FACE_SIZE = 30` (configurable via `.env`) |

**Source:** [accuracy_improvements.py](backend/ai/accuracy_improvements.py#L53)
```python
self.target_size = (224, 224)
# ...
if h < 112 or w < 112:
    scale = max(112 / h, 112 / w)
```

### 1.4 Vector Matching Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **NumPy** | `1.26.4` | Primary embedding arithmetic, L2 distance computation |
| **SciPy** | `1.15.3` | Scientific computing utilities |
| **scikit-learn** | `1.7.1` | Cosine similarity, PCA, KMeans clustering |
| **FAISS** | ⚠️ **NOT IMPLEMENTED** | Documented as future enhancement, not in requirements |

**Vector Matching Logic** - [face_recognition.py](backend/face_recognition.py#L920-L940):
```python
# Euclidean distance (primary)
euclidean_dist = np.linalg.norm(np.array(detected_embedding) - np.array(known_embedding))

# Cosine similarity (secondary)
cosine_similarity = np.dot(detected_embedding, known_embedding) / (
    np.linalg.norm(detected_embedding) * np.linalg.norm(known_embedding)
)

# Weighted combination
combined_distance = (0.7 * euclidean_dist) + (0.3 * cosine_distance * 20)
```

### 1.5 Unified Library: DeepFace

**Version:** `deepface==0.0.95`

DeepFace serves as the unified wrapper providing:
- Face detection (via configurable backends)
- Face alignment
- Face embedding extraction
- Model loading and caching

---

## 2. Group Photo Pipeline Logic

### 2.1 Execution Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLASS PHOTO UPLOAD                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: API Endpoint (routers/attendance.py)                        │
│ - POST /attendance/process-batch                                    │
│ - Upload 3-5 photos for batch processing                            │
│ - Load class-specific students into recognizer                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Enhanced Recognition Entry                                  │
│ - face_recognizer.process_class_photo_enhanced(local_path, class_id)│
│ - Falls back to process_class_photo() if enhanced fails             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Multi-Detector Face Extraction                              │
│ - Cascade: mtcnn → retinaface → mediapipe → opencv                  │
│ - Uses first detector that finds faces                              │
│ - DeepFace.extract_faces(img_path, detector_backend, enforce=False) │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Quality Assessment Filter (per face)                        │
│ - Sharpness: Laplacian variance (weight: 0.35)                      │
│ - Size: face_area / 10000 (weight: 0.30)                            │
│ - Brightness: optimal 100-150 (weight: 0.20)                        │
│ - Contrast: std deviation (weight: 0.15)                            │
│ REJECT if quality_score < MIN_FACE_QUALITY_SCORE (default: 0.4)     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Minimum Size Filter                                         │
│ - REJECT if face_width < 30px OR face_height < 30px                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: Face Enhancement (if quality < 0.7)                         │
│ - Histogram equalization (YCrCb color space)                        │
│ - Adaptive sharpening (Gaussian unsharp mask)                       │
│ - Mild denoising (fastNlMeansDenoisingColored)                      │
│ - Normalize to [0, 255] range                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Embedding Extraction                                        │
│ - Multiple extraction methods with enhanced preprocessing            │
│ - Try: mtcnn+align → retinaface+align → opencv                      │
│ - DeepFace.represent(model=ArcFace, detector='skip', align=True)    │
│ - Normalization: 'Facenet2018' for enhanced mode                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Adaptive Threshold Calculation                              │
│ - Single/Pair (1-2 faces): DISTANCE_THRESHOLD (strict)              │
│ - Small Group (3-10 faces): THRESHOLD + 4.0 (moderate)              │
│ - Large Group (11+ faces): THRESHOLD + 8.0 (relaxed)                │
│ - Quality adjustment: ±2 to ±3 based on face quality score          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9: Matching Against Class Embeddings                           │
│ - Calculate Euclidean distance + Cosine similarity                  │
│ - Combined: (0.7 × euclidean) + (0.3 × cosine × 20)                 │
│ - Track best and second-best matches for ambiguity detection        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 10: Match Decision Logic                                       │
│ - Ambiguity Detection: (second_best - best) < AMBIGUITY_MARGIN (3.0)│
│ - If ambiguous: require confidence ≥ 0.7 to accept                  │
│ - Final confidence: (0.6 × base) + (0.4 × cosine) × quality_factor  │
│ - REJECT if confidence < MIN_CONFIDENCE_THRESHOLD (0.35)            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 11: Return Results                                             │
│ - identified_students: [{student_id, name, confidence, ...}]        │
│ - unidentified_faces_count                                          │
│ - total_faces_detected                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Preprocessing Before Detection

**Source:** [face_recognition.py](backend/face_recognition.py#L200-L222) and [accuracy_improvements.py](backend/ai/accuracy_improvements.py)

1. **No global image resizing** - Images are processed at original resolution
2. **Face-level preprocessing** occurs AFTER detection, not before
3. **Enhanced preprocessing pipeline:**
   - Histogram Equalization (YCrCb space, L channel only)
   - Gaussian Unsharp Masking (weight: 1.5, blur: -0.5)
   - Fast Non-Local Means Denoising (h=10, templateWindow=7, searchWindow=21)

### 2.3 Face Alignment for Multiple Faces

**Source:** [accuracy_improvements.py](backend/ai/accuracy_improvements.py#L56-L80)

```python
def align_face(self, face_image: np.ndarray, facial_area: Dict) -> np.ndarray:
    # Get eye positions from facial area
    left_eye = facial_area.get('left_eye')
    right_eye = facial_area.get('right_eye')
    
    if left_eye and right_eye:
        # Calculate rotation angle between eyes
        angle = np.degrees(np.arctan2(dY, dX))
        # Apply affine rotation to align face
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        aligned = cv2.warpAffine(face_image, M, (w, h), ...)
```

**Key Points:**
- Each face is aligned **independently** using eye landmarks
- DeepFace handles alignment when `align=True` is passed to `represent()`
- Alignment uses eye positions to calculate rotation angle

### 2.4 Low-Quality/Blurry Face Filtering

**Source:** [face_recognition.py](backend/face_recognition.py#L89-L120)

**Quality Assessment Function:**
```python
def calculate_face_quality_score(face_image, facial_area) -> float:
    # Sharpness: Laplacian variance
    sharpness_score = min(cv2.Laplacian(gray, cv2.CV_64F).var() / 500.0, 1.0)
    
    # Size: Face area in pixels
    size_score = min(face_area_pixels / 10000.0, 1.0)
    
    # Brightness: Optimal around 100-150
    brightness_score = 1.0 - abs(mean_brightness - 125) / 125.0
    
    # Contrast: Standard deviation
    contrast_score = min(np.std(gray) / 50.0, 1.0)
    
    # Combined weighted score
    return (sharpness * 0.35) + (size * 0.30) + (brightness * 0.20) + (contrast * 0.15)
```

**Rejection Logic:**
```python
# Filter 1: Quality threshold
if face_quality < MIN_FACE_QUALITY_SCORE:  # Default: 0.4
    logger.info(f"Face rejected (quality {face_quality:.2f} < {MIN_FACE_QUALITY_SCORE})")
    continue

# Filter 2: Minimum size
if face_width < MIN_FACE_SIZE or face_height < MIN_FACE_SIZE:  # Default: 30px
    logger.info(f"Face too small ({face_width}x{face_height} < {MIN_FACE_SIZE}px)")
    continue
```

---

## 3. Database & Storage Structure

### 3.1 Embedding Storage

**Storage Type:** Flat Files (NumPy `.npy` format)

**Location:** `backend/static/dataset/{StudentName}_{RollNo}/face_embedding.npy`

**Source:** [face_recognition.py](backend/face_recognition.py#L469-L475)
```python
@staticmethod
def _student_output_dir(student_name: str, student_roll_no: str):
    student_dir_name = f"{student_name.replace(' ', '_')}_{student_roll_no}"
    output_dir = STATIC_DIR / "dataset" / student_dir_name
    embedding_path = output_dir / "face_embedding.npy"
    return str(output_dir), str(final_photo_path), str(embedding_path)
```

### 3.2 Embedding Format

| Aspect | Details |
|--------|---------|
| **File Format** | NumPy `.npy` binary |
| **Single Image** | Shape: `(512,)` for ArcFace/Facenet512 |
| **Multi-Image Registration** | Shape: `(N, 512)` where N = number of quality embeddings |
| **Averaging** | Quality-weighted averaging with outlier detection |

**Multi-Image Processing:** [face_recognition.py](backend/face_recognition.py#L550-L620)
```python
# Outlier detection using IQR method
valid_indices = detect_outliers(all_embeddings)
filtered_embeddings = [all_embeddings[i] for i in valid_indices]

# Exponential weighting for high-quality embeddings
quality_weights = np.exp(quality_scores * 2.0)
final_embedding = np.average(filtered_stacked, axis=0, weights=quality_weights)
```

### 3.3 Database Schema

**Database Types Supported:**
- **SQLite** (default for development)
- **PostgreSQL** (production option)

**Configuration:** [config.py](backend/config.py#L27-L47)

**Key Tables:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `students` | Student records | `id`, `name`, `roll_no`, `class_id`, `face_encoding_path`, `embedding_model` |
| `classes` | Class/Section organization | `id`, `name`, `section` |
| `attendance_sessions` | Session metadata | `id`, `class_id`, `subject_id`, `photo_path` |
| `attendance_records` | Individual attendance | `student_id`, `session_id`, `is_present`, `confidence` |

**Student Model Embedding Fields:** [database.py](backend/database.py#L136-L145)
```python
face_encoding_path = Column(String(500), nullable=True)
embedding_variants_path = Column(String(500), nullable=True)
embedding_metadata_path = Column(String(500), nullable=True)
embedding_confidence = Column(Float, default=0.8)
embedding_model = Column(String(50), nullable=True)  # e.g., "ArcFace"
embedding_detector = Column(String(50), nullable=True)  # e.g., "mtcnn"
has_enhanced_embeddings = Column(Boolean, default=False)
```

### 3.4 Class-Based Filtering

**Filtering Level:** Database Query + In-Memory

**Source:** [face_recognition.py](backend/face_recognition.py#L373-L400)

```python
def load_class_students(self, db_session, class_id: int):
    """Load students for a specific class only."""
    # Database-level filtering
    students = db_session.query(Student).filter(
        Student.class_id == class_id,
        Student.is_active == True
    ).all()
    
    # In-memory embedding lookup
    self.current_class_students = []
    for student in students:
        for known_student in self.known_students_db:
            if known_student['id'] == student.id:
                self.current_class_students.append(known_student)
                break
```

**Workflow:**
1. **Initial Load:** All student embeddings loaded into memory at startup (`load_all_students()`)
2. **Class Selection:** When teacher selects class, `load_class_students(class_id)` filters in-memory list
3. **Matching:** Only `current_class_students` embeddings are compared during recognition

### 3.5 Vector Database Status

**FAISS:** ⚠️ **DOCUMENTED BUT NOT IMPLEMENTED**

The file [FACIAL_RECOGNITION_OPTIMIZATION.md](FACIAL_RECOGNITION_OPTIMIZATION.md) contains FAISS implementation code as a **future enhancement**, but:
- `faiss` is **not in `requirements.txt`**
- No actual FAISS import in production code
- Current matching uses NumPy vectorized operations only

---

## 4. Hardware Environment & Performance Bottlenecks

### 4.1 Target Hardware Configuration

| Environment | Configuration | Source |
|-------------|---------------|--------|
| **Development** | NVIDIA GTX 1650 GPU, CUDA-enabled | [techdetails.md](techdetails.md#L47) |
| **Production (Cloud)** | AWS g4dn.xlarge (NVIDIA T4, 16GB RAM, 4 vCPUs) | [techdetails.md](techdetails.md#L48) |
| **Actual Runtime** | **CPU-ONLY MODE** | [face_recognition.py](backend/face_recognition.py#L17-L25) |

### 4.2 CPU-Only Mode Enforcement

**Source:** [face_recognition.py](backend/face_recognition.py#L17-L28)

```python
# Configure TensorFlow for CPU-only mode
try:
    import tensorflow as tf
    
    # Force CPU mode
    tf.config.set_visible_devices([], 'GPU')
    print("🖥️ CPU-ONLY MODE")
    
    # Set log level to reduce clutter
    tf.get_logger().setLevel('ERROR')
```

**Dockerfile Configuration:** [Dockerfile](backend/Dockerfile)
- Base image: `ubuntu:22.04` (no CUDA)
- No GPU drivers installed
- Single worker mode: `--workers 1`

### 4.3 Performance Comments & Concerns

**From [FACIAL_RECOGNITION_OPTIMIZATION.md](FACIAL_RECOGNITION_OPTIMIZATION.md#L7-L14):**
```
### Typical Recognition Pipeline:
1. Image Preprocessing (50-100ms)
2. Face Detection (100-200ms) 
3. Face Encoding (200-300ms)
4. Database Comparison (100-500ms)
5. Result Processing (10-50ms)

Total: 460ms - 1.15 seconds per face
```

**From [face_recognition.py](backend/face_recognition.py#L241):**
```python
# Build the model once to avoid slow first-time calls
DeepFace.build_model(RECOGNITION_MODEL)
```

### 4.4 Observed Performance Logs

The codebase includes detailed timing logs:

```python
# Source: face_recognition.py lines 776-780
logger.info(f"⏱️ Face Detection: {face_detection_time:.2f}s - Found {num_faces} faces")
# ...
logger.info(f"⏱️ Face Recognition: {recognition_time:.2f}s - Processed {faces_processed} faces")
logger.info(f"⏱️ Total Processing Time: {total_time:.2f}s")
```

### 4.5 Optimization Features Implemented

| Feature | Status | Configuration |
|---------|--------|---------------|
| Model Pre-loading | ✅ Enabled | `DeepFace.build_model()` at startup |
| Embedding Caching | ✅ Enabled | In-memory `known_students_db` list |
| Multi-Detector Fallback | ✅ Configurable | `ENABLE_MULTI_DETECTOR=true` |
| Redis Caching | ⚠️ Optional | Configured but optional |
| Batch Processing | ✅ Implemented | `ThreadPoolExecutor(max_workers=4)` |
| FAISS Indexing | ❌ Not Implemented | Future enhancement only |
| GPU Acceleration | ❌ Disabled | CPU-only mode enforced |

### 4.6 Memory Management

**Source:** [performance_optimizer.py](backend/optimizations/performance_optimizer.py#L22-L27)

```python
class PerformanceOptimizer:
    def __init__(self):
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        self.embedding_cache = {}
        self.batch_size = 8
        self.gpu_memory_fraction = 0.8  # Not used (CPU mode)
```

### 4.7 Potential Bottlenecks Identified

| Bottleneck | Location | Impact |
|------------|----------|--------|
| **No GPU acceleration** | TensorFlow forced CPU mode | Slower inference |
| **Sequential face processing** | Each face processed one-by-one in group photos | O(n) per photo |
| **No FAISS indexing** | Linear search O(n) vs O(log n) | Slow for large student counts |
| **In-memory embedding load** | All embeddings loaded at startup | Memory pressure with 100+ students |
| **Multi-detector cascade** | Tries detectors sequentially on failure | Can multiply detection time |

---

## 📌 Summary

| Category | Current Implementation |
|----------|------------------------|
| **Face Detection** | MTCNN (primary), RetinaFace/MediaPipe/OpenCV (fallback cascade) |
| **Face Recognition** | ArcFace via DeepFace (512-d embeddings, threshold: 18.0) |
| **Vector Matching** | NumPy + scikit-learn (Euclidean + Cosine weighted) |
| **Embedding Storage** | Flat `.npy` files in filesystem |
| **Database** | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy |
| **Class Filtering** | DB query + in-memory filtering |
| **Hardware Mode** | CPU-ONLY (GPU disabled) |
| **Quality Filtering** | ✅ Blur/size rejection implemented |
| **Face Alignment** | ✅ Eye-based rotation alignment |
| **FAISS/Vector DB** | ❌ Not implemented (documented as future) |

---

*Document generated by analyzing the Facial Attendance System codebase.*
