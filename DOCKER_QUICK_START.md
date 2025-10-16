# 🐳 Docker Deployment Guide - Facial Attendance System

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Accessing Services](#accessing-services)
- [Troubleshooting](#troubleshooting)
- [Advanced Options](#advanced-options)

## Prerequisites

### Required Software
- **Docker** v20.10+ 
- **Docker Compose** v2.0+
- **10GB+ free disk space** (for images and data)
- **4GB+ RAM** (8GB recommended for optimal performance)

### System Requirements
- Linux/macOS/Windows with WSL2
- Internet connection (for first build)
- (Optional) NVIDIA GPU with CUDA 12.x support

## Quick Start

### 1. Clone and Navigate
```bash
cd /home/bitbuggy/Naman_Projects/Facial_Attendance_System
```

### 2. Verify Configuration
Check that `.env` file exists in the root directory:
```bash
ls -la .env
```

### 3. Start All Services
```bash
# Start in detached mode (background)
docker compose up -d

# Or start with logs visible
docker compose up
```

### 4. Wait for Services
First startup takes 5-10 minutes (downloads images, builds, installs dependencies).
Watch progress:
```bash
docker compose logs -f
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Configuration

### Environment Variables (.env)

The `.env` file in the root directory contains all configuration. Key variables:

#### Database Settings
```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=dental_attendance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123  # Change in production!
```

#### Redis Settings
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=""  # Set password for production
```

#### Face Recognition
```env
FACE_RECOGNITION_MODEL=ArcFace
FACE_DETECTOR_BACKEND=retinaface
FACE_DISTANCE_THRESHOLD=18.0
```

#### Storage
```env
PHOTO_STORAGE_TYPE=local  # or "s3" for AWS
BACKEND_BASE_URL=http://localhost:8000
```

### 🔒 Production Settings
For production, update these in `.env`:
```env
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
BACKEND_BASE_URL=https://your-domain.com
REACT_APP_API_BASE=https://your-domain.com
```

## Running the Application

### Start Services
```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d backend

# Rebuild and start (after code changes)
docker compose up -d --build
```

### Stop Services
```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f redis

# Last 100 lines
docker compose logs --tail=100 backend
```

### Check Status
```bash
# View running containers
docker compose ps

# View resource usage
docker stats
```

## Accessing Services

### Frontend (React)
- **URL**: http://localhost:3000
- **Features**: 
  - Student registration with photo upload
  - Face recognition attendance
  - Attendance reports and analytics
  - Class management

### Backend API (FastAPI)
- **URL**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### PostgreSQL Database
```bash
# Connect via Docker
docker exec -it facial_attendance_postgres psql -U postgres -d dental_attendance

# Common commands
\dt              # List tables
\d students      # Describe students table
SELECT * FROM students LIMIT 10;
\q              # Quit
```

### Redis Cache
```bash
# Connect via Docker
docker exec -it facial_attendance_redis redis-cli

# Common commands
PING            # Test connection
KEYS *          # List all keys
GET key_name    # Get value
FLUSHDB        # Clear database
EXIT           # Quit
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker compose logs backend
docker compose logs postgres
```

**Common issues:**
1. **Port already in use**: Change ports in `.env` and `docker-compose.yml`
2. **Out of memory**: Increase Docker memory limit
3. **Database connection failed**: Wait for postgres health check

### Database Connection Errors

```bash
# Check if postgres is healthy
docker compose ps

# Restart database
docker compose restart postgres

# Check database logs
docker compose logs postgres
```

### Redis Connection Errors

```bash
# Test Redis connection
docker exec -it facial_attendance_redis redis-cli PING

# Restart Redis
docker compose restart redis
```

### Frontend Can't Connect to Backend

1. Check backend is running:
```bash
curl http://localhost:8000/health
```

2. Check environment variables:
```bash
docker compose exec frontend env | grep REACT_APP
```

3. Verify API URL in browser console (F12)

### Slow Face Recognition

**Enable GPU (if available):**

Uncomment in `docker-compose.yml`:
```yaml
backend:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

**Requires:**
- NVIDIA GPU
- NVIDIA drivers
- NVIDIA Container Toolkit

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# See disk usage
docker system df
```

## Advanced Options

### GPU Support

**Prerequisites:**
```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**Enable GPU** in docker-compose.yml (uncomment deploy section)

### Custom Port Mapping

Edit `.env`:
```env
POSTGRES_PORT=5433  # If 5432 is in use
REDIS_PORT=6380     # If 6379 is in use
```

Or edit `docker-compose.yml`:
```yaml
backend:
  ports:
    - "8080:8000"  # Map host 8080 to container 8000
```

### Development Mode

Mount code for live reload:
```yaml
backend:
  volumes:
    - ./backend:/app
    - ./backend/static:/app/static
    - ./backend/logs:/app/logs
```

### Scale Services

```bash
# Run multiple backend instances
docker compose up -d --scale backend=3
```

### Backup Database

```bash
# Create backup
docker exec facial_attendance_postgres pg_dump -U postgres dental_attendance > backup.sql

# Restore from backup
docker exec -i facial_attendance_postgres psql -U postgres dental_attendance < backup.sql
```

### Custom Face Recognition Models

Edit `.env`:
```env
# Available models: ArcFace, Facenet, Facenet512, GhostFaceNet, SFace
FACE_RECOGNITION_MODEL=Facenet512

# Available detectors: opencv, mtcnn, ssd, retinaface, dlib, mediapipe
FACE_DETECTOR_BACKEND=mtcnn

# Adjust threshold based on model
FACE_DISTANCE_THRESHOLD=20.0
```

### AWS S3 Storage

Edit `.env`:
```env
PHOTO_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
REACT_APP_PHOTO_BASE=https://your-bucket.s3.us-east-1.amazonaws.com
```

## Useful Commands Cheat Sheet

```bash
# Build without cache
docker compose build --no-cache

# View container details
docker inspect facial_attendance_backend

# Execute command in container
docker exec -it facial_attendance_backend bash

# Copy files from container
docker cp facial_attendance_backend:/app/logs ./local_logs

# Monitor resource usage
docker stats --no-stream

# Clean everything
docker compose down -v --rmi all

# Export logs
docker compose logs > full_logs.txt
```

## Support

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Review this guide
3. Check the main [PROJECT_COMPREHENSIVE_DOCUMENTATION.md](PROJECT_COMPREHENSIVE_DOCUMENTATION.md)
4. Verify `.env` configuration

## Next Steps

After successful deployment:
1. Register students via frontend
2. Upload student photos
3. Test face recognition
4. Configure attendance settings
5. Generate reports

---

**Note**: First build takes several minutes. Subsequent starts are much faster due to Docker layer caching.
