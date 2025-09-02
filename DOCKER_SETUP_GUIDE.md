# Docker Setup Guide for Dental Attendance System

This guide provides step-by-step instructions to containerize and run your Dental Attendance System project using Docker. The setup includes the backend, frontend, and database services, with optional GPU acceleration for machine learning tasks.

---

## 📂 Actual Project Structure

Your current project structure (verified):
```
Naman_Projects/Dental Attendance/
├── backend/                          # Backend (FastAPI)
│   ├── main.py                       # Entry point for FastAPI
│   ├── requirements.txt              # Python dependencies
│   ├── config.py                     # Configuration settings
│   ├── database.py                   # Database connection and operations
│   ├── dependencies.py               # Dependency injection
│   ├── error_handling.py             # Error handling utilities
│   ├── face_recognition.py           # Face recognition core logic
│   ├── migrations.py                 # Database migrations
│   ├── alembic.ini                   # Alembic configuration
│   ├── alembic/                      # Migration scripts
│   ├── routers/                      # API routes
│   │   ├── attendance.py             # Attendance routes
│   │   ├── students.py               # Student management routes
│   │   ├── students_backup.py        # Backup routes
│   │   └── students_corrupted.py     # Corrupted data handling
│   ├── utils/                        # Utility modules
│   │   ├── export_utils.py           # Data export utilities
│   │   ├── logging_utils.py          # Logging configuration
│   │   └── storage_utils.py          # File storage utilities
│   ├── static/                       # Static file storage
│   │   ├── attendance_photos/        # Attendance photos
│   │   ├── dataset/                  # Training datasets
│   │   ├── embeddings/               # Face embeddings
│   │   ├── exports/                  # Export files
│   │   ├── student_photos/           # Student profile photos
│   │   ├── temp/                     # Temporary files
│   │   └── uploads/                  # File uploads
│   ├── logs/                         # Application logs
│   └── backups/                      # Database backups
├── frontend/                         # Frontend (React)
│   ├── package.json                  # Node.js dependencies
│   ├── public/                       # Public assets
│   │   └── index.html                # Main HTML file
│   ├── src/                          # React source code
│   │   ├── index.js                  # Entry point
│   │   ├── App.js                    # Main App component
│   │   ├── api.js                    # API communication
│   │   ├── StudentRegistration.js    # Student registration component
│   │   ├── UploadPanel.js            # File upload component
│   │   ├── Test.js                   # Test component
│   │   ├── components/               # React components
│   │   │   ├── BackupManager.js      # Backup management
│   │   │   ├── EditStudentForm.js    # Edit student form
│   │   │   ├── ManageStudents.js     # Student management
│   │   │   ├── MarkAttendance.js     # Attendance marking
│   │   │   ├── RegisterStudent.js    # Student registration
│   │   │   ├── StudentCard.js        # Student card display
│   │   │   └── ViewAttendance.js     # Attendance viewing
│   │   └── styles/                   # CSS stylesheets
│   │       ├── attendance.css        # Attendance styles
│   │       ├── base.css              # Base styles
│   │       ├── buttons.css           # Button styles
│   │       ├── cards.css             # Card styles
│   │       ├── forms.css             # Form styles
│   │       ├── header.css            # Header styles
│   │       ├── manage-students.css   # Student management styles
│   │       └── ... (other style files)
│   └── build/                        # Production build files
├── backups/                          # Project backups
├── Dataset/                          # Training datasets
└── docker/                           # Docker-related files (to be created)
    ├── Dockerfile.backend            # Dockerfile for backend
    ├── Dockerfile.frontend           # Dockerfile for frontend
    └── docker-compose.yml            # Docker Compose configuration
```

---

## 🛠️ How to Run the Project (Current Method - No Virtual Environment)

### Backend
- **Directory:** Navigate to `backend/`
- **Command:** `python3 main.py` (running directly without venv)
- **Dependencies:** Python 3.10.12, FastAPI, TensorFlow 2.19.1, PyTorch 2.8.0
- **GPU Support:** NVIDIA GTX 1650 with CUDA 12.9
- **Port:** 8000

### Frontend
- **Directory:** Navigate to `frontend/`
- **Command:** `npm start`
- **Dependencies:** Node.js, React
- **Port:** 3000

### Database
- **Type:** PostgreSQL
- **Connection:** localhost:5432/dental_attendance
- **Initialization:** Automatic table creation via SQLAlchemy

### GPU Acceleration
- **Hardware:** NVIDIA GeForce GTX 1650 (2111 MB memory)
- **CUDA Version:** 12.9
- **TensorFlow:** 2.19.1 with GPU acceleration enabled
- **Face Recognition:** Facenet512 model with GPU computation

### Current Startup Process (Verified Working)
1. Open terminal → Navigate to `backend/` → Run `python3 main.py`
2. Open new terminal → Navigate to `frontend/` → Run `npm start`
3. Backend runs on http://localhost:8000
4. Frontend runs on http://localhost:3000

---

## 🐳 Dockerization Steps

### 1. Backend Dockerfile

Create a `Dockerfile` for the backend in `docker/Dockerfile.backend`:
```dockerfile
# Use NVIDIA CUDA base image for GPU support (matches your CUDA 12.9)
FROM nvidia/cuda:12.1-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 python3.10-dev python3-pip \
    libpq-dev gcc g++ \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set Python3.10 as default python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ /app/

# Create necessary directories for static files
RUN mkdir -p /app/static/attendance_photos \
    /app/static/dataset \
    /app/static/embeddings \
    /app/static/exports \
    /app/static/student_photos \
    /app/static/temp \
    /app/static/uploads \
    /app/logs \
    /app/backups

# Set environment variables for GPU
ENV NVIDIA_VISIBLE_DEVICES=all
ENV CUDA_VISIBLE_DEVICES=0
ENV TF_ENABLE_ONEDNN_OPTS=0

# Expose port
EXPOSE 8000

# Command to run the backend (matches your current startup method)
CMD ["python3", "main.py"]
```

### 2. Frontend Dockerfile

Create a `Dockerfile` for the frontend in `docker/Dockerfile.frontend`:
```dockerfile
# Use Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy frontend application code
COPY frontend/ /app/

# Create build directory if it doesn't exist
RUN mkdir -p build

# Expose port
EXPOSE 3000

# Command to run the frontend (matches your current startup method)
CMD ["npm", "start"]
```

### 3. Docker Compose Configuration

Create a `docker-compose.yml` file in the `docker/` directory:
```yaml
version: '3.8'

services:
  database:
    image: postgres:14
    container_name: dental_attendance_db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dental_attendance
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - dental_network

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    container_name: dental_attendance_backend
    ports:
      - "8000:8000"
    volumes:
      - ../backend/static:/app/static
      - ../backend/logs:/app/logs
      - ../backend/backups:/app/backups
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - CUDA_VISIBLE_DEVICES=0
      - DATABASE_URL=postgresql://postgres:password@database:5432/dental_attendance
    depends_on:
      database:
        condition: service_healthy
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              capabilities: [gpu]
    networks:
      - dental_network

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    container_name: dental_attendance_frontend
    ports:
      - "3000:3000"
    volumes:
      - ../frontend/src:/app/src
      - ../frontend/public:/app/public
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - dental_network

volumes:
  postgres_data:

networks:
  dental_network:
    driver: bridge
```

---

## 🚀 Running the Project in Docker

### Prerequisites
1. **Install Docker and Docker Compose**:
   ```bash
   # Update package index
   sudo apt update
   
   # Install Docker
   sudo apt install docker.io docker-compose
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   
   # Restart session or run:
   newgrp docker
   ```

2. **Install NVIDIA Container Toolkit** (for GPU support):
   ```bash
   # Add NVIDIA package repositories
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   
   # Install nvidia-container-toolkit
   sudo apt update && sudo apt install -y nvidia-container-toolkit
   
   # Restart Docker
   sudo systemctl restart docker
   ```

### Setup Steps

1. **Create Docker Directory Structure**:
   ```bash
   cd "/home/bitbuggy/Naman_Projects/Dental Attendance"
   mkdir -p docker
   ```

2. **Create Dockerfiles** (copy the content from sections above):
   - Create `docker/Dockerfile.backend`
   - Create `docker/Dockerfile.frontend`
   - Create `docker/docker-compose.yml`

3. **Navigate to Docker Directory**:
   ```bash
   cd docker/
   ```

4. **Build and Start All Services**:
   ```bash
   # Build and start in detached mode
   docker-compose up --build -d
   
   # Or start with logs visible
   docker-compose up --build
   ```

5. **Check Service Status**:
   ```bash
   docker-compose ps
   ```

6. **View Logs**:
   ```bash
   # All services
   docker-compose logs
   
   # Specific service
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs database
   ```

### Access the Application
- **Backend API:** http://localhost:8000
- **Frontend:** http://localhost:3000
- **Database:** localhost:5432 (PostgreSQL)

### Stop the Containers
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

### Development Workflow
```bash
# Restart specific service after code changes
docker-compose restart backend
docker-compose restart frontend

# Rebuild specific service
docker-compose up --build backend
docker-compose up --build frontend
```

---

## 🛡️ Notes and Recommendations

### Environment Configuration
- **Environment Variables:** Create `.env` files in `backend/` and `frontend/` directories for sensitive configuration
- **Database Connection:** The backend will automatically connect to the PostgreSQL container
- **File Persistence:** Static files, logs, and backups are mounted as volumes for persistence

### GPU Support
- **Hardware Verified:** NVIDIA GeForce GTX 1650 (2111 MB memory)
- **CUDA Version:** 12.9 (compatible with CUDA 12.1 base image)
- **TensorFlow:** 2.19.1 with GPU acceleration
- **Face Recognition:** Facenet512 model with GPU computation
- **Container Toolkit:** Ensure NVIDIA Container Toolkit is installed for GPU access

### Database Initialization
- **Automatic Setup:** SQLAlchemy will create tables automatically on first run
- **Data Persistence:** Database data persists in Docker volume `postgres_data`
- **Backup Integration:** Existing backup system will work with containerized setup

### Development vs Production
- **Current Setup:** Development mode with hot reloading and volume mounts
- **Production:** Create separate production Dockerfiles with optimized builds
- **Security:** Use secure passwords and environment variables in production

### Troubleshooting
- **GPU Issues:** Verify NVIDIA drivers and container toolkit installation
- **Permission Issues:** Ensure proper file permissions for mounted volumes
- **Database Connection:** Check if PostgreSQL container is healthy before starting backend
- **Port Conflicts:** Ensure ports 3000, 8000, and 5432 are available

### File Structure After Docker Setup
```
Naman_Projects/Dental Attendance/
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── backend/ (existing)
├── frontend/ (existing)
└── ... (rest of your project files)
```

### Migration from Current Setup
1. **No Code Changes Required:** Your existing backend and frontend code will work as-is
2. **Database Migration:** Export existing PostgreSQL data and import into Docker container if needed
3. **Static Files:** Existing static files in `backend/static/` will be mounted and accessible
4. **Configuration:** Update any hardcoded localhost references to use container names

---

This Docker setup maintains compatibility with your current project structure and startup process while providing the benefits of containerization, including easier deployment, dependency management, and environment consistency.
