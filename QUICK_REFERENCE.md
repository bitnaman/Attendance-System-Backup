# 📋 FACIAL ATTENDANCE SYSTEM - QUICK REFERENCE CARD

**Quick command reference for daily operations**

---

## 🚀 **STARTING THE SYSTEM**

### Start Backend
```bash
cd backend
source ../venv/bin/activate  # If using virtual environment
python3 main.py
```

### Start Frontend
```bash
cd frontend
npm start
```

### Start Both (Background)
```bash
# Terminal 1
cd backend && python3 main.py &

# Terminal 2  
cd frontend && npm start &
```

---

## 🔍 **SYSTEM VERIFICATION**

### Quick Health Check
```bash
./verify_setup.sh
```

### Check Services Running
```bash
# Check if backend is running
curl http://localhost:8000/

# Check if frontend is running
curl http://localhost:3000/
```

### Check Ports
```bash
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
```

---

## 🗄️ **DATABASE OPERATIONS**

### Connect to Database
```bash
psql -U dental_user -d dental_attendance -h localhost
```

### Common SQL Queries
```sql
-- List all tables
\dt

-- Count students
SELECT COUNT(*) FROM students;

-- View classes
SELECT id, name, section FROM classes;

-- Recent attendance sessions
SELECT * FROM attendance_sessions ORDER BY created_at DESC LIMIT 10;

-- Exit
\q
```

### Database Backup
```bash
# Create backup
pg_dump -U dental_user -d dental_attendance > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U dental_user -d dental_attendance < backup_20251016.sql
```

### Reset Database
```bash
./initialize_database.sh --fresh
```

---

## 🐍 **PYTHON ENVIRONMENT**

### Activate Virtual Environment
```bash
source venv/bin/activate
```

### Deactivate
```bash
deactivate
```

### Install/Update Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Check Package Version
```bash
pip show tensorflow
pip show deepface
pip list | grep opencv
```

---

## 🧪 **TESTING & DEBUGGING**

### Test Database Connection
```bash
cd backend
python3 -c "from database import SessionLocal; db = SessionLocal(); print('✅ DB OK'); db.close()"
```

### Test Face Recognition
```bash
python3 -c "from deepface import DeepFace; print('✅ DeepFace OK')"
```

### Check GPU
```bash
nvidia-smi  # GPU status
python3 -c "import tensorflow as tf; print('GPU:', len(tf.config.list_physical_devices('GPU')))"
```

### View Logs
```bash
# Application logs
tail -f backend/logs/app.log

# Follow logs in real-time
tail -f backend/logs/app.log | grep ERROR
```

---

## 🌐 **WEB INTERFACES**

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main web interface |
| Backend API | http://localhost:8000 | REST API |
| Swagger Docs | http://localhost:8000/docs | Interactive API docs |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |

---

## 🔧 **CONFIGURATION**

### Edit Environment Variables
```bash
nano backend/.env
```

### Key Settings
```bash
# Database
POSTGRES_DB=dental_attendance
POSTGRES_USER=dental_user
POSTGRES_PASSWORD=dental_pass_2025

# Face Recognition
FACE_RECOGNITION_MODEL=ArcFace        # High accuracy
FACE_DETECTOR_BACKEND=retinaface      # Best detection

# Storage
PHOTO_STORAGE_TYPE=local              # or 's3'
```

### Restart After Config Change
```bash
# Kill backend process
pkill -f "python3 main.py"

# Restart
cd backend && python3 main.py
```

---

## 🧹 **CLEANUP & MAINTENANCE**

### Kill All Processes
```bash
./kill_project.sh
```

### Clear Cache/Temp Files
```bash
./clear_data.sh
```

### Clean Python Cache
```bash
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -type f -name "*.pyc" -delete
```

### Free Disk Space
```bash
# Check disk usage
du -sh backend/static/*

# Clean old attendance photos (be careful!)
# find backend/static/attendance_photos -mtime +30 -delete
```

---

## 📊 **MONITORING**

### Check System Resources
```bash
# CPU and Memory
htop

# GPU usage (if available)
watch -n 1 nvidia-smi

# Disk usage
df -h
```

### Check Database Size
```bash
psql -U dental_user -d dental_attendance -c "SELECT pg_size_pretty(pg_database_size('dental_attendance'));"
```

### Monitor API Requests
```bash
# Follow backend logs
tail -f backend/logs/app.log | grep "INFO"
```

---

## 🔄 **UPDATES & UPGRADES**

### Update Code
```bash
git pull origin main
```

### Update Python Dependencies
```bash
cd backend
pip install --upgrade -r requirements.txt
```

### Update Frontend Dependencies
```bash
cd frontend
npm update
```

### Migrate Database (if needed)
```bash
cd backend
alembic upgrade head
```

---

## 🆘 **TROUBLESHOOTING**

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000
# Kill it
kill -9 <PID>
```

### Database Connection Failed
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check status
sudo systemctl status postgresql
```

### Permission Denied
```bash
# Fix permissions
sudo chown -R $USER:$USER .
chmod -R 755 backend/static/
```

### Module Not Found
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
cd backend
pip install -r requirements.txt
```

---

## 📞 **QUICK HELP**

### Run Setup Verification
```bash
./verify_setup.sh
```

### View Documentation
```bash
ls *.md  # List all documentation files
cat README.md
```

### API Documentation
Open browser: http://localhost:8000/docs

---

## 💡 **TIPS & TRICKS**

### Run Backend on Different Port
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001
```

### Run with More Workers (Production)
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Export Attendance Data
```bash
# Via API
curl http://localhost:8000/api/attendance/export?format=csv > attendance.csv
```

### Batch Register Students
```bash
# Create CSV with student data and use API or web interface
# Format: name,age,roll_no,prn,seat_no,class_id,photo_path
```

---

**Last Updated:** October 16, 2025  
**For detailed guides, see:** `QUICK_SETUP_GUIDE.md`
