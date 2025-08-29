# 🎓 BTech Attendance System - Detailed Technical Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Technical Stack](#technical-stack)
- [Hardware Requirements](#hardware-requirements)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Deployment Guide](#deployment-guide)
- [Security & Performance](#security--performance)
- [Maintenance & Backup](#maintenance--backup)
- [Troubleshooting & Limitations](#troubleshooting--limitations)
- [References & Resources](#references--resources)

## Project Overview

### Introduction
The BTech Attendance System is an advanced facial recognition-based attendance management system specifically designed for IT & AIML departments. It leverages deep learning and GPU acceleration to provide accurate, real-time attendance tracking through classroom photos.

### Core Goals
- Automate attendance tracking using facial recognition
- Support class-based organization and filtering
- Provide real-time processing with high accuracy
- Ensure scalable and secure deployment
- Enable comprehensive attendance analytics

## Technical Stack

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.10+
- **AI/ML**: 
  - DeepFace with Facenet512 model
  - MTCNN for face detection
  - TensorFlow with CUDA support
- **Database**: PostgreSQL
- **Dependencies**: 
```python
# Core requirements from requirements.txt
fastapi
uvicorn[standard]
sqlalchemy>=2.0
psycopg2-binary
opencv-python-headless
deepface
tensorflow[and-cuda]
```

### Frontend
- **Framework**: React 18
- **Key Libraries**:
  - React DOM
  - React Scripts
- **Build Tools**: Create React App

### Database
- PostgreSQL 14+
- SQLAlchemy ORM
- Alembic for migrations

## Hardware Requirements

### Local Development
- **Minimum**:
  - CPU: 4 cores
  - RAM: 8GB
  - GPU: NVIDIA GTX 1650 4GB
  - Storage: 20GB

### Production (AWS)
- **Recommended**:
  - Instance: g4dn.xlarge
  - GPU: NVIDIA T4
  - vCPUs: 4
  - RAM: 16GB
  - Storage: 100GB gp3 EBS

### CUDA Requirements
```bash
# Required CUDA setup
CUDA Version: 11.8+
cuDNN Version: 8.6+
NVIDIA Driver: 520.61.05+
```

## Architecture

### Database Schema
```sql
-- Key database models
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(10) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    prn VARCHAR(50) UNIQUE NOT NULL,
    class_id INTEGER REFERENCES classes(id),
    photo_path VARCHAR(500),
    face_encoding_path VARCHAR(500)
);

CREATE TABLE attendance_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(200) NOT NULL,
    class_id INTEGER REFERENCES classes(id),
    photo_path VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Photo Storage Architecture
The system uses a structured file system approach for storing student photos and face encodings:

1. **Student Registration Photos**:
   - **Path Pattern**: `/backend/static/dataset/[Student_Name]_[Roll_No]/`
   - **Contents**: 
     - `face.jpg`: Student's registration photo
     - `face_embedding.npy`: NumPy binary file containing face embedding vector
   - **Database Reference**: The `photo_path` in the `students` table points to this location

2. **Attendance Session Photos**:
   - **Path**: `/backend/static/attendance_photos/`
   - **Naming Convention**: `[Session_Name]_[Class_Name]_[Section]_[Date]_[Time].jpg`

3. **Export Files**:
   - **Path**: `/backend/static/exports/`
   - **Format**: Excel (.xlsx) and CSV files for attendance reports

### Face Recognition Pipeline
1. **Image Preprocessing**:
   ```python
   # From face_recognition.py
   RECOGNITION_MODEL = "Facenet512"
   DETECTOR_BACKEND = "mtcnn"
   DISTANCE_THRESHOLD = 20.0
   MIN_CONFIDENCE_THRESHOLD = 0.10
   ENHANCED_PREPROCESSING = True
   ```

2. **Face Recognition Pipeline**:
   - **Student Registration**:
     1. Upload student photo(s)
     2. System creates directory structure: `/dataset/[Student_Name]_[Roll_No]/`
     3. Photos are saved as `face.jpg` in this directory
     4. DeepFace extracts facial embeddings using Facenet512
     5. Embeddings saved as `face_embedding.npy` NumPy binary file
     6. Multiple photos use quality-weighted averaging for robust embeddings
   
   - **Attendance Processing**:
     1. Upload class photo to system
     2. MTCNN detects all faces in the image
     3. Extract embeddings for each detected face
     4. Compare against stored embeddings using combined distance metrics:
        - Euclidean distance (70% weight)
        - Cosine similarity (30% weight)
     5. Apply confidence thresholds to validate matches
     6. Filter matches by class/section when specified
     7. Return matched students with confidence scores

### Directory Structure
```
backend/
├── alembic/                 # Database migrations
├── routers/                 # API endpoints
├── static/                  # File storage
│   ├── dataset/             # Student registration photos and face embeddings
│   │   ├── [Student_Name]_[ID]/   # Individual student folders
│   │   │   ├── face.jpg           # Student's registration photo
│   │   │   └── face_embedding.npy # Processed face embeddings
│   ├── attendance_photos/  # Session photos
│   ├── face_encodings/    # Additional encodings
│   ├── student_photos/    # Reserved for future use
│   ├── exports/          # Exported reports
│   └── temp/             # Temporary processing files
├── main.py                 # FastAPI application
├── face_recognition.py     # Recognition logic
└── database.py            # SQLAlchemy models

frontend/
├── src/
│   ├── components/        # React components
│   ├── api.js            # API integration
│   └── App.js            # Main application
└── package.json
```

## Development Setup

### Local Environment Setup
1. **Clone & Install Dependencies**:
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
```

2. **Environment Variables**:
```bash
# Backend (.env)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dental_attendance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Frontend (.env)
REACT_APP_API_BASE=http://localhost:8000
```

3. **Database Setup**:
```bash
# Initialize database
cd backend
alembic upgrade head
```

### Running Locally
1. **Start Backend**:
```bash
# From project root
./start_backend_smart.sh
```

2. **Start Frontend**:
```bash
# From project root
cd frontend
npm start
```

## Deployment Guide

### AWS Setup

1. **Instance Configuration**:
```bash
# Install NVIDIA drivers
sudo apt-get update
sudo apt-get install -y nvidia-driver-520

# Install CUDA Toolkit
wget https://developer.download.nvidia.com/compute/cuda/11.8.0/local_installers/cuda_11.8.0_520.61.05_linux.run
sudo sh cuda_11.8.0_520.61.05_linux.run
```

2. **Docker Setup**:
```dockerfile
# Backend Dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Photo Storage in Production

When deploying to AWS, you have two options for photo storage:

1. **Local Storage on EC2**:
   - Default approach: uses the same directory structure as local development
   - **Pros**: Simple setup, no additional configuration
   - **Cons**: Limited by instance storage, requires backup strategy
   - **Recommendation**: Use EBS volumes for persistence

2. **AWS S3 Integration**:
   ```python
   # Example S3 integration code to add to face_recognition.py
   import boto3
   from botocore.exceptions import NoCredentialsError
   
   def upload_to_s3(local_file, bucket_name, s3_file):
       s3 = boto3.client('s3',
           aws_access_key_id=os.getenv('AWS_ACCESS_KEY'),
           aws_secret_access_key=os.getenv('AWS_SECRET_KEY')
       )
       try:
           s3.upload_file(local_file, bucket_name, s3_file)
           return f"s3://{bucket_name}/{s3_file}"
       except NoCredentialsError:
           logger.error("S3 credentials not available")
           return None
   ```
   
   Implementation requires modifying photo paths to use S3 URLs in database.

### Security Configuration

1. **CORS Settings**:
```python
# In backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Environment Variables Management**:
```bash
# Production environment variables
export POSTGRES_HOST=your-rds-instance
export POSTGRES_PASSWORD=your-secure-password
export CUDA_VISIBLE_DEVICES=0
```

### Authentication & Security

1. **API Authentication**:
```python
# JWT Token implementation in dependencies.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

# Constants
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-for-local-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Token generation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

2. **HTTPS Configuration**:
```nginx
# Nginx configuration for HTTPS (SSL/TLS)
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **Secrets Management**:
   - Use AWS Secrets Manager or HashiCorp Vault in production
   - Store database credentials, API keys, and JWT secrets securely
   - Rotate secrets regularly (90-day policy recommended)

## Security & Performance

### Security Measures
- HTTPS enforcement
- Environment variable encryption
- Regular security audits
- Input validation and sanitization

### Performance Optimization
1. **GPU Utilization**:
   - Batch processing for multiple faces
   - GPU memory management
   - Parallel processing where possible

2. **Database Optimization**:
   - Indexed queries
   - Connection pooling
   - Regular vacuum and analyze

3. **GPU Tuning for Production**:
   ```bash
   # GPU memory limiting for optimal TensorFlow performance
   export TF_MEMORY_ALLOCATION=0.7  # Use 70% of available GPU memory
   
   # CUDA performance tuning
   export CUDA_CACHE_DISABLE=0
   export CUDA_AUTO_BOOST=1
   ```

4. **Scaling Strategies**:
   - **Vertical Scaling**: Upgrade to more powerful GPU (T4 → A10 → A100)
   - **Horizontal Scaling**: Deploy multiple GPU instances behind load balancer
   - **Caching**: Implement Redis cache for frequent attendance queries
   - **Database Partitioning**: Partition attendance records by date ranges

5. **Performance Monitoring**:
   ```python
   # Example monitoring code for face recognition performance
   import time
   
   def benchmark_face_detection(image_path):
       start_time = time.time()
       faces = DeepFace.extract_faces(image_path, detector_backend=DETECTOR_BACKEND)
       detection_time = time.time() - start_time
       
       logger.info(f"Face detection: {len(faces)} faces in {detection_time:.3f}s")
       return detection_time, len(faces)
   ```

## Maintenance & Backup

### Backup Strategy
1. **Database Backups**:
   ```bash
   # Automated backup script
   ./backup_db.sh
   ```

2. **Photo Storage Backup**:
   - Daily incremental backups
   - Weekly full backups
   - 30-day retention policy

### Data Retention
- Student photos: Duration of enrollment
- Attendance records: 5 years
- System logs: 90 days

## Troubleshooting & Limitations

### Known Issues
1. **GPU Memory Leaks**:
   - Symptom: Increasing GPU memory usage
   - Solution: Periodic model reloading

2. **Large Class Processing**:
   - Limitation: Max 100 faces per image
   - Workaround: Split processing for larger groups

### Performance Limits
- Max concurrent users: 200
- Max image size: 10MB
- Processing time: 1-3 seconds per image

### Deployment Nuances

1. **GPU Driver Compatibility Matrix**:
   | CUDA Version | Min Driver | Recommended Driver | TensorFlow Version |
   |--------------|------------|-------------------|-------------------|
   | CUDA 11.8    | 520.61.05  | 525.105.17        | TensorFlow 2.12.0 |
   | CUDA 11.7    | 515.43.04  | 515.65.01         | TensorFlow 2.11.0 |
   | CUDA 11.2    | 460.27.04  | 460.32.03         | TensorFlow 2.10.0 |

2. **AWS Specific Configuration**:
   ```bash
   # GPU status verification on AWS
   nvidia-smi -L
   
   # Required AWS instance types by workload
   # - Development: g4dn.xlarge (16GB RAM, 4 vCPUs, T4 GPU)
   # - Production: g5.xlarge (32GB RAM, 4 vCPUs, A10G GPU)
   # - High volume: p3.2xlarge (61GB RAM, 8 vCPUs, V100 GPU)
   ```

3. **Deployment Checklist**:
   - [ ] Verify CUDA drivers match TensorFlow requirements
   - [ ] Test face recognition with sample dataset
   - [ ] Benchmark GPU performance before going live
   - [ ] Configure auto-scaling based on CPU/GPU metrics
   - [ ] Set up CloudWatch alarms for resource utilization

4. **Common Deployment Issues**:
   - TensorFlow CUDA compatibility mismatches
   - Missing cuDNN libraries
   - Insufficient EBS volume IOPS for database operations
   - Security group restrictions blocking frontend-backend communication

5. **Workarounds for Known Limitations**:
   ```python
   # GPU memory fragmentation fix
   import tensorflow as tf
   gpus = tf.config.experimental.list_physical_devices('GPU')
   if gpus:
       try:
           for gpu in gpus:
               tf.config.experimental.set_memory_growth(gpu, True)
       except RuntimeError as e:
           print(e)
   ```

## References & Resources

### Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [DeepFace Documentation](https://github.com/serengil/deepface)
- [React Documentation](https://reactjs.org/)

### Useful Links
- [CUDA Installation Guide](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html)
- [AWS GPU Instance Setup](https://docs.aws.amazon.com/dlami/latest/devguide/gpu.html)
- [PostgreSQL Optimization Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [TensorFlow GPU Guide](https://www.tensorflow.org/guide/gpu)
- [Nvidia Docker Installation](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- [DeepFace Models Comparison](https://github.com/serengil/deepface/blob/master/tests/face-recognition-models.py)

### Manual Tuning Tips

1. **GPU Memory Optimization**:
   ```python
   # In face_recognition.py
   import tensorflow as tf
   
   # Prevent TensorFlow from using all GPU memory
   gpus = tf.config.experimental.list_physical_devices('GPU')
   if gpus:
       for gpu in gpus:
           tf.config.experimental.set_memory_growth(gpu, True)
   ```

2. **Database Query Optimization**:
   ```sql
   -- Add these indexes to improve query performance
   CREATE INDEX idx_students_class_id ON students(class_id);
   CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
   CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
   CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
   ```

3. **Frontend Performance**:
   ```javascript
   // Implement lazy loading for student images
   import { lazy, Suspense } from 'react';
   
   const StudentPhoto = lazy(() => import('./StudentPhoto'));
   
   function StudentList({ students }) {
     return (
       <div>
         {students.map(student => (
           <Suspense fallback={<div>Loading...</div>}>
             <StudentPhoto key={student.id} photoUrl={student.photoUrl} />
           </Suspense>
         ))}
       </div>
     );
   }
   ```

4. **NGINX Caching Configuration**:
   ```nginx
   # Add to nginx.conf to cache static files
   http {
     proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=attendance_cache:10m max_size=500m;
     
     server {
       location ~* \.(jpg|jpeg|png|gif)$ {
         proxy_cache attendance_cache;
         proxy_cache_valid 200 1d;
         expires 1d;
         add_header Cache-Control "public";
       }
     }
   }
   ```

### Support
For technical support or contributions, please contact:
- Project maintainer: bitnaman
- Repository: Facial_Attendance_System
