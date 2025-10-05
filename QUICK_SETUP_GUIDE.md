# 🚀 FACIAL ATTENDANCE SYSTEM - QUICK SETUP GUIDE

**Get your facial attendance system running in minutes!**

*Last Updated: September 6, 2025*

---

## 📋 **PREREQUISITES**

### **System Requirements**
- Ubuntu 22.04 LTS (recommended) or similar Linux distribution
- Python 3.10 (required - other versions not tested)
- 8GB RAM minimum, 16GB recommended
- 2GB free disk space
- Internet connection for package downloads

### **Optional but Recommended**
- NVIDIA GPU with 4GB+ VRAM for better performance
- SSD storage for faster image processing

---

## 🛠️ **STEP 1: INSTALL BASIC SOFTWARE**

### **Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

### **Install Python 3.10**
```bash
sudo apt install python3.10 python3.10-dev python3.10-venv python3-pip -y
```

### **Install PostgreSQL Database**
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### **Install Development Tools**
```bash
sudo apt install build-essential cmake git curl wget -y
```

### **Install NVIDIA Drivers (Optional - for GPU acceleration)**
```bash
sudo apt install nvidia-driver-525 -y
# Reboot after installation: sudo reboot
```

---

## 📥 **STEP 2: DOWNLOAD PROJECT**

### **Clone Repository**
```bash
git clone https://github.com/bitnaman/Facial_Attendance_System.git
cd Facial_Attendance_System
```

### **Create Python Virtual Environment** (Optional)
```bash
python3.10 -m venv venv
source venv/bin/activate
```

---

## 📦 **STEP 3: INSTALL PYTHON REQUIREMENTS**

### **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

**Note**: This will install 140+ packages including TensorFlow, OpenCV, face recognition libraries, and all dependencies. Installation may take 10-15 minutes.

---

## ⚙️ **STEP 4: DATABASE SETUP**

### **Configure PostgreSQL**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user (in PostgreSQL shell)
CREATE DATABASE dental_attendance;
CREATE USER postgres WITH PASSWORD 'root';
GRANT ALL PRIVILEGES ON DATABASE dental_attendance TO postgres;
\q
```

### **Test Database Connection**
```bash
python3 -c "import psycopg2; psycopg2.connect('postgresql://postgres:root@localhost/dental_attendance'); print('✅ Database connected')"
```

---

## 🔧 **STEP 5: CONFIGURATION SETUP**

### **Environment Variables**
The `.env` file is already configured with default settings:
- Database: `dental_attendance` on localhost
- User: `postgres` with password `root`
- Face detector: `retinaface` (high accuracy)
- Storage: Local file system

### **Verify Configuration**
```bash
cat .env
```

### **Create Required Directories**
```bash
mkdir -p backend/static/uploads
mkdir -p backend/static/dataset
mkdir -p backend/static/attendance_photos
mkdir -p backend/static/student_photos
mkdir -p backend/static/exports
```

---

## 🗄️ **STEP 6: DATABASE INITIALIZATION**

### **Run Database Migrations**
```bash
cd backend
python3 main.py
```

**This will automatically**:
- Create all required tables (`students`, `attendance`, etc.)
- Set up database schema
- Initialize the system

**Press Ctrl+C to stop after seeing "Application startup complete"**

---

## 🚀 **STEP 7: START THE APPLICATION**

### **Start Backend Server**
```bash
cd backend
python3 main.py
```

### **Start Frontend (New Terminal)**
```bash
cd frontend
npm install
npm start
```

---

## 🌐 **STEP 8: ACCESS THE SYSTEM**

### **Web Interface**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### **First Time Setup**
1. Register students with photos
2. Test face recognition
3. Mark attendance
4. Export reports

---

## ✅ **VERIFICATION CHECKLIST**

### **Database Check**
```bash
python3 -c "from backend.database import engine; print('✅ Database OK')"
```

### **Face Recognition Check**
```bash
python3 -c "from deepface import DeepFace; print('✅ Face Recognition OK')"
```

### **GPU Check (Optional)**
```bash
python3 -c "import tensorflow as tf; print('GPU:', len(tf.config.list_physical_devices('GPU')) > 0)"
```

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues**

**Database Connection Error**
```bash
sudo systemctl restart postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'root';"
```

**Permission Issues**
```bash
chmod +x backend/main.py
sudo chown -R $USER:$USER .
```

**Python Module Not Found**
```bash
source venv/bin/activate
pip install -r backend/requirements.txt
```

**GPU Not Detected**
```bash
nvidia-smi  # Check if drivers are working
sudo apt install nvidia-cuda-toolkit
```

---

## 📁 **PROJECT STRUCTURE OVERVIEW**

```
Facial_Attendance_System/
├── backend/           # FastAPI server
├── frontend/          # React web interface
├── .env              # Configuration file
└── README.md         # Project documentation
```

---

## 🎯 **NEXT STEPS**

1. **Register Students**: Add student photos via web interface
2. **Configure Settings**: Adjust face recognition thresholds if needed
3. **Test Attendance**: Try marking attendance with photos
4. **Export Data**: Generate attendance reports
5. **Production Deploy**: Use gunicorn for production deployment


**🎉 Your facial attendance system is now ready to use!**

---

*This guide gets you from zero to working system in under 30 minutes. For advanced configuration and production deployment, refer to the comprehensive documentation.*
