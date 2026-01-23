# Docker Deployment Guide for Facial Attendance System

This guide covers deploying the Facial Attendance System using Docker, both locally and on Google Cloud Platform (GCP).

## 🐳 Local Docker Setup

### Prerequisites
- Docker installed and running
- Docker Compose installed
- NVIDIA Docker runtime (for GPU support)

### Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd /home/bitbuggy/Naman_Projects/Facial_Attendance_System
   ```

2. **Test Docker setup:**
   ```bash
   ./test-docker.sh
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Docker Commands

**Build images:**
```bash
# Backend
docker build -t facial-attendance-backend:latest ./backend/

# Frontend
docker build -t facial-attendance-frontend:latest ./frontend/
```

**Run individual services:**
```bash
# PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=dental_attendance \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  postgres:15-alpine

# Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Backend (with GPU support)
docker run -d --name backend \
  --gpus all \
  -e DATABASE_URL=postgresql://postgres:postgres123@host.docker.internal:5432/dental_attendance \
  -e REDIS_HOST=host.docker.internal \
  -p 8000:8000 \
  facial-attendance-backend:latest

# Frontend
docker run -d --name frontend \
  -p 3000:80 \
  facial-attendance-frontend:latest
```

## ☁️ Google Cloud Platform Deployment

### Prerequisites
- Google Cloud SDK installed
- kubectl installed
- Docker installed
- GCP project with billing enabled

### Quick Deployment

1. **Set environment variables:**
   ```bash
   export PROJECT_ID="your-gcp-project-id"
   export REGION="us-central1"
   export ZONE="us-central1-a"
   ```

2. **Run deployment script:**
   ```bash
   ./deploy-gcp.sh
   ```

### Manual GCP Setup

1. **Enable required APIs:**
   ```bash
   gcloud services enable container.googleapis.com
   gcloud services enable compute.googleapis.com
   gcloud services enable storage.googleapis.com
   ```

2. **Create GKE cluster with GPU:**
   ```bash
   gcloud container clusters create facial-attendance-cluster \
     --zone=us-central1-a \
     --machine-type=n1-standard-4 \
     --num-nodes=2 \
     --accelerator=type=nvidia-tesla-t4,count=1 \
     --enable-autoscaling \
     --min-nodes=1 \
     --max-nodes=5
   ```

3. **Install NVIDIA device plugin:**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.16.2/nvidia-device-plugin.yml
   ```

4. **Build and push images:**
   ```bash
   # Configure Docker for GCR
   gcloud auth configure-docker
   
   # Build and push backend
   docker build -t gcr.io/$PROJECT_ID/facial-attendance-backend:latest ./backend/
   docker push gcr.io/$PROJECT_ID/facial-attendance-backend:latest
   
   # Build and push frontend
   docker build -t gcr.io/$PROJECT_ID/facial-attendance-frontend:latest ./frontend/
   docker push gcr.io/$PROJECT_ID/facial-attendance-frontend:latest
   ```

5. **Deploy to GKE:**
   ```bash
   kubectl apply -f gcp-deployment.yaml
   ```

## 🔧 Configuration

### Environment Variables

**Root `.env` file (single source of truth):**
```env
# Database
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/dental_attendance

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Storage
PHOTO_STORAGE_TYPE=gcs  # or 'local' or 's3'
GCS_BUCKET_NAME=facial-attendance-storage

# Face Recognition
FACE_RECOGNITION_MODEL=ArcFace
FACE_DETECTOR_BACKEND=retinaface
FACE_DISTANCE_THRESHOLD=18.0

# Performance
TF_FORCE_GPU_ALLOW_GROWTH=true
ENABLE_ASYNC_PROCESSING=true
BATCH_SIZE=8
MAX_WORKERS=4

# Features
LOAD_BALANCER_ENABLED=true
MONITORING_ENABLED=true
PREDICTIVE_ANALYTICS_ENABLED=true
```

### Storage Options

1. **Local Storage (Default):**
   ```env
   PHOTO_STORAGE_TYPE=local
   ```

2. **Google Cloud Storage:**
   ```env
   PHOTO_STORAGE_TYPE=gcs
   GCS_BUCKET_NAME=your-bucket-name
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

3. **AWS S3:**
   ```env
   PHOTO_STORAGE_TYPE=s3
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-bucket-name
   ```

## 🚀 Production Optimizations

### GPU Configuration
- **T4**: Best price/performance for inference
- **L4**: 2-3x faster than T4, higher cost
- **A100**: Maximum performance, highest cost

### Resource Limits
```yaml
resources:
  requests:
    memory: "4Gi"
    cpu: "2000m"
    nvidia.com/gpu: 1
  limits:
    memory: "8Gi"
    cpu: "4000m"
    nvidia.com/gpu: 1
```

### Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 📊 Monitoring and Logging

### Health Checks
- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000/health`

### Monitoring Endpoints
- System metrics: `http://localhost:8000/monitoring/metrics`
- Performance analytics: `http://localhost:8000/monitoring/performance`
- Real-time monitoring: `ws://localhost:8000/ws/metrics`

### Logs
```bash
# Docker Compose logs
docker-compose logs backend
docker-compose logs frontend

# Kubernetes logs
kubectl logs -f deployment/backend -n facial-attendance
kubectl logs -f deployment/frontend -n facial-attendance
```

## 🔧 Troubleshooting

### Common Issues

1. **GPU not detected:**
   ```bash
   # Check NVIDIA Docker runtime
   docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
   ```

2. **Out of memory errors:**
   - Reduce `BATCH_SIZE` in environment
   - Increase memory limits in deployment
   - Use smaller model or detector

3. **Database connection issues:**
   - Check PostgreSQL is running
   - Verify connection string
   - Check network connectivity

4. **Storage issues:**
   - Verify credentials for cloud storage
   - Check bucket permissions
   - Ensure proper environment variables

### Performance Tuning

1. **GPU Memory:**
   ```env
   TF_FORCE_GPU_ALLOW_GROWTH=true
   ```

2. **Batch Processing:**
   ```env
   BATCH_SIZE=8  # Adjust based on GPU memory
   MAX_WORKERS=4  # Adjust based on CPU cores
   ```

3. **Caching:**
   ```env
   REDIS_CACHE_EXPIRATION_SECONDS=300
   ```

## 📋 Maintenance

### Updates
```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Or rebuild
docker-compose up -d --build
```

### Backups
```bash
# Database backup
docker exec postgres pg_dump -U postgres dental_attendance > backup.sql

# Restore
docker exec -i postgres psql -U postgres dental_attendance < backup.sql
```

### Scaling
```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n facial-attendance

# Check status
kubectl get pods -n facial-attendance
```

## 🎯 Next Steps

1. **Set up monitoring dashboards**
2. **Configure SSL certificates**
3. **Set up automated backups**
4. **Implement CI/CD pipeline**
5. **Configure alerting**

## 📞 Support

For issues and questions:
- Check logs: `docker-compose logs`
- Monitor resources: `kubectl top pods`
- Test endpoints: `curl http://localhost:8000/health`
