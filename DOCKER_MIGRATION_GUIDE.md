# Docker Migration Guide: Changes Required for Containerization

This document outlines all the necessary changes to make your Dental Attendance System Docker-ready. No code changes are needed in your core application logic - only configuration updates.

---

## 📋 Summary of Required Changes

### 1. Environment Configuration Updates
- **Files Affected:** `.env` files in both backend and frontend
- **Change Type:** Replace localhost references with Docker service names
- **Impact:** Database connections and API communication

### 2. Hardcoded URL References
- **Files Affected:** 1 frontend component file
- **Change Type:** Remove hardcoded localhost URLs
- **Impact:** API calls from frontend components

### 3. Docker Files Creation
- **Files to Create:** 3 new Docker configuration files
- **Location:** New `docker/` directory
- **Impact:** Enable containerized deployment

---

## 🔧 Detailed Change Requirements

### Step 1: Backend Configuration Changes

**File:** `backend/.env`
- **Current:** `POSTGRES_HOST=localhost`
- **Change to:** `POSTGRES_HOST=database`
- **Current:** `BACKEND_BASE_URL=http://localhost:8000`
- **Change to:** `BACKEND_BASE_URL=http://backend:8000`

**File:** `backend/.env.example`
- **Current:** `POSTGRES_HOST=localhost`
- **Change to:** `POSTGRES_HOST=database`
- **Current:** `BACKEND_BASE_URL=http://localhost:8000`
- **Change to:** `BACKEND_BASE_URL=http://backend:8000`

**File:** `backend/.env.local`
- **Current:** `POSTGRES_HOST=localhost`
- **Change to:** `POSTGRES_HOST=database`
- **Current:** `BACKEND_BASE_URL=http://localhost:8000`
- **Change to:** `BACKEND_BASE_URL=http://backend:8000`

**File:** `backend/alembic.ini`
- **Current:** `sqlalchemy.url = postgresql://postgres:root@localhost:5432/dental_attendance`
- **Change to:** `sqlalchemy.url = postgresql://postgres:root@database:5432/dental_attendance`

### Step 2: Frontend Configuration Changes

**File:** `frontend/.env`
- **Current:** `REACT_APP_API_BASE=http://localhost:8000`
- **Change to:** `REACT_APP_API_BASE=http://localhost:8000` (keep for external access)
- **Current:** `REACT_APP_PHOTO_BASE=http://localhost:8000`
- **Change to:** `REACT_APP_PHOTO_BASE=http://localhost:8000` (keep for external access)

**File:** `frontend/.env.example`
- **Current:** `REACT_APP_API_BASE=http://localhost:8000`
- **Change to:** `REACT_APP_API_BASE=http://localhost:8000` (keep for external access)
- **Current:** `REACT_APP_PHOTO_BASE=http://localhost:8000`
- **Change to:** `REACT_APP_PHOTO_BASE=http://localhost:8000` (keep for external access)

**File:** `frontend/src/StudentRegistration.js` (Line 44)
- **Current:** `const response = await fetch("http://127.0.0.1:8000/student/", {`
- **Change to:** `const response = await fetch(\`\${API_BASE}/student/\`, {`
- **Additional:** Add import at top: `import { API_BASE } from './api';`

### Step 3: Docker Files Creation

**Create Directory:** `docker/`

**Create File:** `docker/Dockerfile.backend`
- **Purpose:** Backend container configuration
- **Size:** ~50 lines
- **Content:** CUDA base image, Python dependencies, GPU support

**Create File:** `docker/Dockerfile.frontend`
- **Purpose:** Frontend container configuration
- **Size:** ~20 lines
- **Content:** Node.js base image, React application setup

**Create File:** `docker/docker-compose.yml`
- **Purpose:** Multi-service orchestration
- **Size:** ~80 lines
- **Content:** Database, backend, frontend services with networking

---

## 🎯 Implementation Steps

### Phase 1: Environment Preparation
1. **Create docker directory**
   - Location: Project root
   - Action: `mkdir docker`

2. **Update backend environment files**
   - Files: `.env`, `.env.example`, `.env.local`
   - Change: Replace `localhost` with `database` for POSTGRES_HOST
   - Change: Replace `localhost` with `backend` for BACKEND_BASE_URL

3. **Update backend alembic configuration**
   - File: `alembic.ini`
   - Change: Replace `localhost` with `database` in database URL

### Phase 2: Frontend Updates
1. **Update frontend environment files**
   - Files: `.env`, `.env.example`
   - Note: Keep localhost for external browser access

2. **Fix hardcoded API call**
   - File: `src/StudentRegistration.js`
   - Change: Replace hardcoded URL with API_BASE variable
   - Add: Import statement for API_BASE

### Phase 3: Docker Configuration
1. **Create backend Dockerfile**
   - Features: CUDA support, Python 3.10, GPU acceleration
   - Dependencies: All requirements.txt packages

2. **Create frontend Dockerfile**
   - Features: Node.js 18, React development server
   - Dependencies: All package.json packages

3. **Create docker-compose configuration**
   - Services: PostgreSQL, Backend (FastAPI), Frontend (React)
   - Features: GPU support, volume mounts, networking

### Phase 4: Testing & Validation
1. **Build containers**
   - Command: `docker-compose build`
   - Expected: All services build successfully

2. **Start services**
   - Command: `docker-compose up`
   - Expected: All services start and connect

3. **Verify functionality**
   - Backend: http://localhost:8000
   - Frontend: http://localhost:3000
   - Database: Internal service communication

---

## 🚨 Critical Notes

### Database Service Name
- **Docker Compose Service:** `database`
- **Internal hostname:** `database` (not localhost)
- **External access:** Still `localhost:5432`

### API Communication
- **Backend to Database:** Use `database:5432`
- **Frontend to Backend:** Use `localhost:8000` (browser context)
- **Internal Backend URL:** `backend:8000`

### Volume Mounts
- **Static files:** `backend/static` → `/app/static`
- **Logs:** `backend/logs` → `/app/logs`
- **Source code:** For development hot-reloading

### GPU Support
- **Required:** NVIDIA Container Toolkit
- **Configuration:** Docker Compose GPU device mapping
- **Verification:** TensorFlow GPU detection in logs

---

## 🔍 Files Summary

### Files to Modify (6 files)
1. `backend/.env` - Database host configuration
2. `backend/.env.example` - Template configuration
3. `backend/.env.local` - Local environment
4. `backend/alembic.ini` - Database migration configuration
5. `frontend/.env` - API base URL (optional)
6. `frontend/src/StudentRegistration.js` - Remove hardcoded API URL

### Files to Create (3 files)
1. `docker/Dockerfile.backend` - Backend container image
2. `docker/Dockerfile.frontend` - Frontend container image
3. `docker/docker-compose.yml` - Service orchestration

### No Changes Required
- Core application logic (`main.py`, `config.py`, React components)
- Database models and migrations
- Face recognition algorithms
- Static file handling
- Logging configuration

---

**Total Implementation Time:** 30-60 minutes
**Risk Level:** Low (no application logic changes)
**Rollback:** Keep backup of original `.env` files
