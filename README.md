# 🎓 Bharati Facify - Facial Attendance System

> AI-powered facial recognition attendance system for educational institutions, designed for BTech IT & AIML programs.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![React](https://img.shields.io/badge/React-18+-61DAFB)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

Bharati Facify is a complete facial attendance management system built for educational institutions. It uses state-of-the-art deep learning models to recognize students from individual or group photos and automatically mark attendance.

### Key Highlights

- 🧠 **AI-Powered Recognition**: Uses Facenet512/ArcFace models for 98%+ accuracy
- 👥 **Group Photo Support**: Detect and recognize multiple students in a single photo
- 🖥️ **CPU-Optimized**: Runs efficiently on CPU without requiring GPU
- 📊 **Analytics Dashboard**: Visual insights into attendance patterns
- 🔐 **Role-Based Access**: Superadmin and Teacher roles with different permissions
- 📱 **Responsive UI**: Works on desktop and mobile browsers

---

## ✨ Features

### Core Features
| Feature | Description |
|---------|-------------|
| **Face Recognition** | Identify students using deep learning (Facenet512, ArcFace) |
| **Group Attendance** | Mark attendance for entire class from a single photo |
| **Student Management** | Register students with photos, manage profiles |
| **Class Organization** | Organize students by BTech programs (IT/AIML) and sections |
| **Subject Management** | Create subjects per class with credit hours |
| **Attendance Export** | Export attendance reports as Excel/CSV/PDF |
| **Medical Leave Tracking** | Track and manage student medical leaves |
| **Analytics Dashboard** | View attendance trends, statistics, and insights |

### Technical Features
| Feature | Description |
|---------|-------------|
| **Multi-Detector Fallback** | Falls back through MTCNN → RetinaFace → MediaPipe → OpenCV |
| **Adaptive Thresholds** | Automatically adjusts recognition thresholds for group photos |
| **Quality Assessment** | Filters out blurry or low-quality face detections |
| **JWT Authentication** | Secure API access with token-based auth |

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Core programming language |
| **FastAPI** | High-performance web framework |
| **SQLite** | Lightweight file-based database (default) |
| **TensorFlow 2.19** | Deep learning framework (CPU-optimized) |
| **DeepFace** | Face recognition library |
| **SQLAlchemy** | ORM for database operations |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **JavaScript/CSS** | Frontend logic and styling |
| **Nginx** | Production web server (optional) |

### Optional Components
| Technology | Purpose | Required? |
|------------|---------|-----------|
| **Redis** | Caching & performance optimization | ❌ Optional (falls back to in-memory) |
| **PostgreSQL** | Alternative to SQLite for production | ❌ Optional |
| **Docker** | Containerized deployment | ❌ Optional |
| **AWS S3/Azure Blob** | Cloud photo storage | ❌ Optional |

---

## 📁 Project Structure

```
Facial_Attendance_System/
├── backend/                    # FastAPI Backend
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration management
│   ├── database.py             # SQLAlchemy models
│   ├── face_recognition.py     # Face recognition engine
│   ├── requirements.txt        # Python dependencies
│   ├── routers/                # API route handlers
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── students.py         # Student management
│   │   ├── attendance.py       # Attendance marking
│   │   ├── subjects.py         # Subject management
│   │   └── ...
│   ├── utils/                  # Utility modules
│   ├── static/                 # Static files & uploads
│   │   ├── student_photos/     # Registered student photos
│   │   ├── attendance_photos/  # Uploaded attendance photos
│   │   ├── dataset/            # Face embeddings
│   │   └── exports/            # Generated reports
│   └── ai/                     # Advanced AI modules
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── App.js              # Main React component
│   │   ├── components/         # UI components
│   │   └── api.js              # API client
│   ├── public/                 # Static assets
│   └── package.json            # Node.js dependencies
│
├── .env                        # Environment configuration
├── .env.azure.example          # Azure deployment template
├── create_admin.py             # Create admin user script
├── setup_local_env.sh          # Local setup script
└── AZURE_DEPLOYMENT_GUIDE.md   # Cloud deployment guide
```

---

## 📋 Prerequisites

### Required
- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **Git** for version control

### System Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 4 GB | 8 GB |
| **CPU** | 2 cores | 4+ cores |
| **Storage** | 5 GB | 10 GB |
| **GPU** | Not required | Not required (CPU-optimized) |

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/Facial_Attendance_System.git
cd Facial_Attendance_System
```

### Step 2: Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Or run the setup script (recommended)
chmod +x setup_local_env.sh
./setup_local_env.sh
```

### Step 3: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

> ⚠️ **Note**: First installation may take 5-10 minutes to download TensorFlow and face recognition models.

### Step 4: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 5: Create Admin User

```bash
cd ../backend
python create_admin.py
```

Follow the prompts to create a superadmin account.

---

## ▶️ Running the Application

### Development Mode

**Terminal 1 - Start Backend:**
```bash
cd backend
python main.py
```

Backend will start at: `http://localhost:8000`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
```

Frontend will start at: `http://localhost:3000`

### Access Points

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Web Application (Frontend) |
| `http://localhost:8000` | Backend API |
| `http://localhost:8000/docs` | Interactive API Documentation (Swagger) |
| `http://localhost:8000/health` | Health Check Endpoint |

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DATABASE_TYPE=sqlite              # "sqlite" (default) or "postgresql"
DB_FILE=attendance.db             # SQLite database file

# ===========================================
# FACE RECOGNITION CONFIGURATION
# ===========================================
FACE_RECOGNITION_MODEL=Facenet512 # Facenet512, ArcFace, GhostFaceNet
FACE_DETECTOR_BACKEND=mtcnn       # mtcnn, retinaface, mediapipe, opencv
FACE_DISTANCE_THRESHOLD=22.0      # Lower = stricter matching

# ===========================================
# PHOTO STORAGE
# ===========================================
PHOTO_STORAGE_TYPE=local          # "local" or "s3" or "azure"
BACKEND_BASE_URL=http://localhost:8000

# ===========================================
# AUTHENTICATION
# ===========================================
AUTH_SECRET_KEY=your-secret-key   # Change this in production!
ACCESS_TOKEN_EXPIRE_MINUTES=480   # 8 hours

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=INFO
LOG_THROTTLE_MS=1000
```

### Face Recognition Models

| Model | Accuracy | Speed | Best For |
|-------|----------|-------|----------|
| **Facenet512** | ⭐⭐⭐⭐⭐ | Fast | Group photos (default) |
| **ArcFace** | ⭐⭐⭐⭐⭐ | Moderate | Highest accuracy |
| **GhostFaceNet** | ⭐⭐⭐⭐ | Very Fast | Real-time processing |
| **Facenet** | ⭐⭐⭐ | Very Fast | Basic recognition |

### Face Detector Backends

| Detector | Accuracy | Speed | Max Faces |
|----------|----------|-------|-----------|
| **MTCNN** | ⭐⭐⭐⭐½ | Moderate | 50-80 |
| **RetinaFace** | ⭐⭐⭐⭐⭐ | Slow | 100+ |
| **MediaPipe** | ⭐⭐⭐⭐ | Fast | 30-50 |
| **OpenCV** | ⭐⭐ | Very Fast | 5-10 |

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login and get JWT token |
| `GET` | `/auth/me` | Get current user info |
| `POST` | `/auth/register` | Register new user (admin only) |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/student/` | List all students |
| `POST` | `/student/` | Register new student |
| `GET` | `/student/{id}` | Get student details |
| `DELETE` | `/student/{id}` | Delete student |

### Attendance Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/attendance/mark` | Mark attendance from photo |
| `GET` | `/attendance/sessions` | List attendance sessions |
| `GET` | `/attendance/records` | Get attendance records |
| `GET` | `/attendance/export` | Export attendance report |

### Class & Subject Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/classes/` | List all classes |
| `POST` | `/classes/` | Create new class |
| `GET` | `/subjects/` | List subjects |
| `POST` | `/subjects/` | Create subject |

> 📝 **Full API documentation available at:** `http://localhost:8000/docs`

---

## ☁️ Deployment

### Option 1: Direct Deployment (Recommended for Testing)

Run directly on a cloud VM (Azure, AWS, GCP):

```bash
# Install dependencies
pip install -r backend/requirements.txt
cd frontend && npm install && npm run build

# Start backend
cd backend && python main.py

# Serve frontend (use nginx or serve package)
npx serve -s frontend/build -l 3000
```

### Option 2: Docker Deployment (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Option 3: Azure Deployment

See [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) for detailed Azure deployment instructions.

**Estimated Azure Costs (CPU-only):**
| Service | Cost/Month |
|---------|------------|
| VM (B2s) | ~$30-40 |
| Storage | ~$5 |
| **Total** | ~$35-45 |

---

## 🔧 Troubleshooting

### Common Issues

#### 1. TensorFlow Installation Errors
```bash
# Use CPU-only version
pip install tensorflow-cpu==2.19.1
```

#### 2. Face Recognition Model Download
First run downloads models (~500MB). Ensure stable internet.

#### 3. Database Locked (SQLite)
```bash
# Kill any existing backend processes
pkill -f "python main.py"
```

#### 4. Port Already in Use
```bash
# Kill processes on ports 3000 and 8000
./kill_project.sh
```

#### 5. Frontend Can't Connect to Backend
Check `.env` has correct `REACT_APP_API_BASE`:
```bash
REACT_APP_API_BASE=http://localhost:8000
```

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Superadmin** | Full access: manage users, classes, students, settings |
| **Teacher** | Mark attendance, view reports, manage own sessions |

---

## 📊 Performance Notes

### CPU-Only Mode
- Face recognition: 2-5 seconds per face
- Group photos (10 faces): 20-30 seconds
- Recommended: Use OpenCV detector for faster processing

### Optimization Tips
1. Use `FACE_DETECTOR_BACKEND=opencv` for speed
2. Set `BATCH_SIZE=1` for CPU
3. Enable `ADAPTIVE_THRESHOLD_MODE=enabled` for group photos

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Documentation**: Check `/docs` endpoint for API reference

---


*Bharati Facify v2.0.0*
