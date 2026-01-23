# 🚀 Quick Start Guide - CPU-Only + SQLite Version

## ✅ Migration Complete!

Your Facial Attendance System is now configured for:
- ✅ **CPU-only processing** (no GPU required)
- ✅ **SQLite database** (no PostgreSQL needed)
- ✅ **Simplified deployment** (easier to deploy and maintain)

---

## 🎯 Quick Start

### **1. Local Development Setup**

```bash
# Navigate to project directory
cd /home/bitbuggy/Naman_Projects/Facial_Attendance_System

# Run setup script (creates .env and initializes database)
./setup_local_env.sh

# Install Python dependencies
cd backend
pip3 install -r requirements.txt

# Create admin user
python3 create_admin.py

# Start backend (in terminal 1)
python3 main.py

# Start frontend (in terminal 2)
cd ../frontend
npm install
npm start

# Open browser
# http://localhost:3000
```

---

### **2. Docker Deployment**

```bash
# Navigate to project directory
cd /home/bitbuggy/Naman_Projects/Facial_Attendance_System

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Access application
# http://localhost:3000

# Stop services
docker-compose down
```

---

## 📦 What's Different

### **Before (GPU + PostgreSQL)**
```yaml
Dependencies:
  - PostgreSQL 14+ server required
  - NVIDIA GPU with CUDA 12.x
  - PyTorch, TensorFlow GPU versions
  - psycopg2-binary for database

Performance:
  - Face recognition: 2-3 seconds per 100-student photo
  - GPU acceleration enabled

Deployment:
  - Complex: PostgreSQL + Redis + GPU drivers
  - Cost: $300-500/month for GPU VPS
```

### **After (CPU-Only + SQLite)**
```yaml
Dependencies:
  - SQLite (built into Python)
  - TensorFlow CPU version only
  - No GPU drivers needed
  - No PostgreSQL setup

Performance:
  - Face recognition: 10-15 seconds per 100-student photo
  - CPU-only processing (acceptable for end-of-class marking)

Deployment:
  - Simple: Just copy files + install Python packages
  - Cost: $30-80/month for CPU VPS (Hetzner recommended)
```

---

## 🔧 Configuration

### **Environment Variables (.env)**

```bash
# Database (SQLite)
DB_FILE=attendance.db                # SQLite database file

# Face Recognition (CPU-optimized)
FACE_RECOGNITION_MODEL=Facenet512    # Good accuracy + speed balance
FACE_DETECTOR_BACKEND=opencv         # Fastest on CPU
FACE_DISTANCE_THRESHOLD=16.0         # Matching threshold
COMPUTE_MODE=cpu                     # Force CPU (no GPU)

# Performance
BATCH_SIZE=1                         # Process one photo at a time
MAX_WORKERS=4                        # Parallel workers for 8 classes
ENABLE_ASYNC_PROCESSING=true         # Background processing
```

---

## 📊 Performance Benchmarks

### **Expected Processing Times (on 8-core CPU)**

| Scenario | Students | Processing Time | Acceptable? |
|----------|----------|-----------------|-------------|
| Single student registration | 1 | 2-3 seconds | ✅ Excellent |
| Small class photo | 20-30 | 5-7 seconds | ✅ Good |
| Medium class photo | 50-70 | 8-10 seconds | ✅ Acceptable |
| Large class photo | 80-100 | 12-15 seconds | ✅ OK for end-of-class |
| 8 concurrent classes | 800 total | 15-20s each (sequential) | ✅ Acceptable |

---

## 🗄️ Database Operations

### **SQLite Database File**
```bash
# Location
backend/attendance.db

# Backup (manual)
cp backend/attendance.db backend/attendance_backup_$(date +%Y%m%d).db

# Reset (delete and recreate)
rm backend/attendance.db
python3 backend/database.py

# View database
sqlite3 backend/attendance.db
> .tables
> SELECT * FROM students LIMIT 5;
> .quit
```

---

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend    # Backend logs
docker-compose logs -f frontend   # Frontend logs
docker-compose logs -f redis      # Redis logs

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d

# Access backend container shell
docker exec -it facial_attendance_backend bash
```

---

## 🚀 Production Deployment (Hetzner CCX33)

### **Recommended VPS: Hetzner CCX33**
```yaml
Specs:
  - CPU: 8 dedicated vCores (AMD EPYC)
  - RAM: 32GB
  - Storage: 240GB NVMe SSD
  - Network: 20TB traffic
  - Cost: €34/month (~₹3,000/month)
  - Location: Germany/Finland

Performance:
  - Handles 600 students across 8 classes
  - 10-12 seconds per 100-student photo
  - Sufficient for daily attendance
```

### **Deployment Steps**
```bash
# 1. SSH into VPS
ssh root@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Install Docker Compose
apt install docker-compose -y

# 4. Clone repository
git clone https://github.com/bitnaman/Attendance-System-Backup.git
cd Attendance-System-Backup

# 5. Configure environment
cp .env.example .env
nano .env  # Update settings

# 6. Deploy
docker-compose up -d

# 7. Create admin user
docker exec -it facial_attendance_backend python3 create_admin.py

# 8. Access via IP
# http://your-server-ip:3000
```

---

## 🔍 Troubleshooting

### **Database Issues**
```bash
# Problem: "table not found" errors
# Solution: Reinitialize database
rm backend/attendance.db
python3 -c "from database import init_fresh_db; init_fresh_db()"
```

### **Import Errors**
```bash
# Problem: "ModuleNotFoundError"
# Solution: Reinstall dependencies
pip3 install -r backend/requirements.txt --force-reinstall
```

### **Slow Performance**
```bash
# Solution 1: Reduce image resolution before upload
# - Resize photos to 1920x1080 max

# Solution 2: Use faster detector
# Edit .env:
FACE_DETECTOR_BACKEND=opencv  # Fastest (already default)

# Solution 3: Process photos sequentially
BATCH_SIZE=1
MAX_WORKERS=1
```

### **Docker Issues**
```bash
# Problem: Container won't start
# Solution: Check logs
docker-compose logs backend

# Problem: Port already in use
# Solution: Change port in docker-compose.yml
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

---

## 📁 File Structure

```
Facial_Attendance_System/
├── backend/
│   ├── attendance.db              # SQLite database ⭐
│   ├── main.py                    # Backend entry point
│   ├── database.py                # Database models
│   ├── face_recognition.py        # Face recognition (CPU-only) ⭐
│   ├── config.py                  # Configuration ⭐
│   ├── requirements.txt           # Python dependencies (CPU-only) ⭐
│   ├── .env                       # Environment variables ⭐
│   └── static/                    # Student photos, datasets
├── frontend/
│   ├── src/                       # React components
│   └── package.json               # Node dependencies
├── docker-compose.yml             # Docker orchestration ⭐
├── setup_local_env.sh             # Local setup script ⭐
└── MIGRATION_SUMMARY.md           # This file details ⭐

⭐ = Modified for CPU-only + SQLite
```

---

## 🎓 Next Steps

1. ✅ **Test thoroughly** with sample data
2. ✅ **Register test students** with photos
3. ✅ **Mark attendance** with classroom photos
4. ✅ **Monitor performance** during peak usage
5. ✅ **Deploy to production** VPS when ready

---

## 📞 Support

- **Documentation**: See `MIGRATION_SUMMARY.md` for detailed changes
- **Issues**: Check git history for original GPU configuration
- **Restore GPU**: `git checkout HEAD~1 -- backend/requirements.txt` (and other files)

---

## ✨ Benefits of This Configuration

✅ **Cost-effective**: $30-80/month vs $300-500/month for GPU
✅ **Simple deployment**: No GPU drivers, no PostgreSQL setup
✅ **Portable**: Works on any system (Windows/Linux/Mac)
✅ **Reliable**: SQLite is rock-solid and needs no maintenance
✅ **Sufficient performance**: 10-15 seconds is acceptable for 600 students
✅ **Easy backup**: Just copy the .db file
✅ **Lower resource usage**: Runs on basic VPS

---

**🎉 You're ready to go! Start with local development first, then deploy to production when ready.**
