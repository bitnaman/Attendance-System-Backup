# BTech Attendance System – Comprehensive Project Summary

---

## 1. Project Overview & Objectives

The BTech Attendance System is an intelligent, automated solution for managing student attendance in IT & AIML departments. It leverages facial recognition to streamline attendance marking, student registration, and reporting. Key objectives:
- Automate attendance via classroom photo uploads
- Enable robust student registration (multi-photo, class-based)
- Provide analytics and exportable reports
- Support secure, scalable deployment (local and cloud)

---

## 2. Technical Stack

**Backend:**
- FastAPI (Python 3.10+)
- SQLAlchemy ORM
- DeepFace (Facenet512 model)
- TensorFlow 2.x (GPU-enabled)
- OpenCV
- Alembic (DB migrations)

**Frontend:**
- React 18
- CSS3, HTML5
- Modular component architecture

**Database:**
- PostgreSQL 12+ (production)
- SQLite (dev/test)

**AI/ML Components:**
- Face detection: MTCNN
- Face embedding: Facenet512
- Recognition: Euclidean distance matching
- Multi-photo registration, embedding averaging

---

## 3. Hardware Details

- **Local Development:** NVIDIA GTX 1650 GPU (CUDA-enabled)
- **Cloud Deployment:** AWS g4dn.xlarge (NVIDIA T4 GPU, 16GB RAM, 4 vCPUs)

---

## 4. Backend Architecture & APIs

- **FastAPI app** (`backend/main.py`): RESTful endpoints for attendance, student management, session analytics
- **Database Models:** Students, AttendanceSessions, AttendanceRecords
- **Face Recognition Pipeline:**
  - Upload classroom photo → detect faces → extract embeddings → match with registered students
- **Key APIs:**
  - `POST /attendance/mark` – Mark attendance from photo
  - `GET /students` – List students
  - `POST /students/register` – Register new student (multi-photo)
  - `PUT /students/{id}` – Edit student
  - `DELETE /students/{id}` – Remove student
  - `GET /attendance/sessions` – List attendance sessions
  - `GET /attendance/session/{id}` – Get session details
  - `GET /export/attendance` – Export attendance data

---

## 5. Frontend Architecture & Integration Points

- **React SPA** (`frontend/src/App.js`):
  - Tabs for Attendance, Student Management, Analytics
  - API integration via `api.js` (uses `REACT_APP_API_BASE` for backend URL)
  - Multi-photo upload for registration
  - Attendance submission via photo upload
  - Session/record views, export options
- **Integration Points:**
  - All backend APIs accessed via HTTPS endpoints
  - CORS enabled on backend for frontend domain

---

## 6. Deployment Plan & Cloud Infrastructure Setup

- **AWS EC2 (g4dn.xlarge):**

  - Ubuntu 22.04 LTS
  - NVIDIA T4 GPU drivers, CUDA toolkit
  - Docker (recommended) or native Python venv
  - PostgreSQL (managed or self-hosted)
  - Nginx/Traefik for HTTPS termination and reverse proxy

  - **Steps:**

  1. Provision EC2 instance, attach EBS storage
  2. Install GPU drivers, CUDA, Docker
  3. Deploy backend (FastAPI) with GPU support
  4. Deploy frontend (React build) via Nginx
  5. Configure HTTPS (Let's Encrypt or ACM)
  6. Set up CORS and API security (API keys, JWT optional)

**PostgreSQL Setup & Initialization:**
  - You must create the database before starting the backend.
  - Tables are auto-created by SQLAlchemy ORM on first run, but Alembic migrations are recommended for production.
  - Example steps:
   1. Install PostgreSQL (`sudo apt install postgresql`)
   2. Start PostgreSQL service (`sudo systemctl start postgresql`)
   3. Create database and user:
     ```bash
     sudo -u postgres psql
     CREATE DATABASE dental_attendance;
     CREATE USER dental_user WITH PASSWORD 'yourpassword';
     GRANT ALL PRIVILEGES ON DATABASE dental_attendance TO dental_user;
     \q
     ```
   4. Update `backend/config.py` or environment variables with DB credentials.
   5. (Optional) Run Alembic migrations:
     ```bash
     cd backend
     alembic upgrade head
     ```
   6. On first backend start, tables will be created if not present.
  - For managed PostgreSQL (AWS RDS), use the AWS console to create DB and user, then update backend config.

---

## 7. Development Workflow & Environment Setup

- **Local (GTX 1650):**
  - Install Python 3.10+, CUDA toolkit, NVIDIA drivers
  - `pip install -r backend/requirements.txt`
  - `npm install` in `frontend/`
  - Use SQLite for quick dev, PostgreSQL for full test
- **Cloud (T4):**
  - Same as local, but ensure CUDA version matches T4 requirements
  - Use PostgreSQL for production
  - Backend runs with GPU-enabled TensorFlow

---

## 8. Running Backend & Frontend Locally (GTX 1650)

**Backend:**
```bash
cd backend
bash setup_gpu.sh  # Installs CUDA dependencies
python main.py     # Or use uvicorn for production
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## 9. Frontend-Backend Connection & Security

- Set `REACT_APP_API_BASE` in `.env` (frontend) to backend URL (e.g., `https://localhost:8000`)
- Enable CORS in FastAPI (`from fastapi.middleware.cors import CORSMiddleware`)
- Use HTTPS for all API traffic (Nginx reverse proxy recommended)
- Optionally restrict API access via API keys/JWT

---

## 10. Performance & Scaling Notes (GTX 1650 vs T4)

- **GTX 1650:** Suitable for small classes, dev/test, limited concurrency
- **T4 (AWS):** Handles larger batches, faster embedding extraction, better concurrency
- **Scaling:**
  - Use GPU for face recognition only; scale backend horizontally if needed
  - Use managed PostgreSQL for DB scaling
  - Frontend can be served via S3/CloudFront for global access

---

## 11. Additional Info for Smooth Deployment & Operation

- Always match CUDA/TensorFlow versions to GPU hardware
- Monitor GPU utilization and memory (nvidia-smi)
- Regularly backup attendance and student data (`backups/` folder)
- Use environment variables for secrets and config
- Document API endpoints and expected payloads for integration
- Test with real classroom photos for accuracy
- Keep frontend and backend versions in sync

---

## 12. References
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [DeepFace](https://github.com/serengil/deepface)
- [AWS g4dn Instances](https://aws.amazon.com/ec2/instance-types/g4/)
- [React Docs](https://react.dev/)

