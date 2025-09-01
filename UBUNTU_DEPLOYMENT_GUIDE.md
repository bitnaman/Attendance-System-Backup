# 🚀 Dental Attendance System - Ubuntu 22.04 AWS T4 Deployment Guide

## System Overview
This guide will help you deploy the Dental Attendance System on Ubuntu 22.04 with NVIDIA T4 GPU on AWS. The system consists of:
- **Backend**: FastAPI with face recognition using TensorFlow and DeepFace
- **Frontend**: React application
- **Database**: PostgreSQL
- **GPU**: NVIDIA T4 for accelerated face recognition

---

## 📋 Prerequisites & System Requirements

### Hardware Requirements
- ✅ AWS instance with NVIDIA T4 GPU
- ✅ Ubuntu 22.04 LTS
- ✅ Minimum 8GB RAM (16GB recommended)
- ✅ 50GB+ storage space

### Software Stack to Install
1. **NVIDIA GPU Drivers & CUDA**
2. **Python 3.10+**
3. **Node.js 18+ & npm**
4. **PostgreSQL 14+**
5. **Git**
6. **System utilities**

---

## 🔧 Step 1: System Update & Basic Tools

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop tree unzip software-properties-common

# Install build essentials
sudo apt install -y build-essential cmake pkg-config
```

---

## 🎮 Step 2: NVIDIA GPU Setup (Critical for Face Recognition)

### Install NVIDIA Drivers
```bash
# Check GPU status
lspci | grep -i nvidia

# Install NVIDIA drivers
sudo apt install -y nvidia-driver-525

# Reboot system
sudo reboot
```

After reboot, verify driver installation:
```bash
nvidia-smi
```

### Install CUDA Toolkit
```bash
# Add NVIDIA package repository
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb

# Install CUDA
sudo apt update
sudo apt install -y cuda-toolkit-12-2

# Add CUDA to PATH
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# Verify CUDA installation
nvcc --version
```

### Install cuDNN (for TensorFlow)
```bash
# Download cuDNN (you may need to register on NVIDIA developer website)
# Or install via apt
sudo apt install -y libcudnn8 libcudnn8-dev
```

---

## 🐍 Step 3: Python Environment Setup

### Install Python 3.10+
```bash
# Python should be pre-installed, but verify
python3 --version

# Install pip and venv
sudo apt install -y python3-pip python3-venv python3-dev

# Install additional Python dependencies for OpenCV
sudo apt install -y python3-opencv libopencv-dev
sudo apt install -y libhdf5-dev libhdf5-serial-dev libhdf5-103
sudo apt install -y libqtgui4 libqtwebkit4 libqt4-test python3-pyqt5
```

---

## 🗄️ Step 4: PostgreSQL Database Setup

### Install PostgreSQL
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Configure Database
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, create database and user:
CREATE DATABASE dental_attendance;
CREATE USER postgres WITH PASSWORD 'root';
GRANT ALL PRIVILEGES ON DATABASE dental_attendance TO postgres;
ALTER USER postgres CREATEDB;
\q
```

### Configure PostgreSQL for remote connections (if needed)
```bash
# Edit postgresql.conf
sudo vim /etc/postgresql/14/main/postgresql.conf

# Find and modify:
# listen_addresses = '*'

# Edit pg_hba.conf
sudo vim /etc/postgresql/14/main/pg_hba.conf

# Add line for local connections:
# host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🌐 Step 5: Node.js & npm Setup

### Install Node.js 18+
```bash
# Install Node.js via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

---

## 📁 Step 6: Project Setup

### Navigate to Project Directory
```bash
cd "/home/bitbuggy/Naman_Projects/Dental Attendance"
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Upgrade pip globally
sudo pip3 install --upgrade pip

# Install Python dependencies globally
sudo pip3 install -r requirements.txt

# If TensorFlow installation fails, try:
sudo pip3 install tensorflow[and-cuda]==2.13.0

# Create .env file for environment variables
cat << EOF > .env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dental_attendance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root
PHOTO_STORAGE_TYPE=local
BACKEND_BASE_URL=http://localhost:8000
EOF
```

### Frontend Setup
```bash
# Open new terminal and navigate to frontend
cd "/home/bitbuggy/Naman_Projects/Dental Attendance/frontend"

# Install npm dependencies
npm install

# If you encounter permission issues:
sudo chown -R $(whoami) ~/.npm
npm install
```

---

## 🗃️ Step 7: Database Migration

```bash
# Go back to backend directory
cd "/home/bitbuggy/Naman_Projects/Dental Attendance/backend"

# Run database migrations
python3 migrations.py

# Or create tables manually if needed
python3 -c "
from database import engine, Base
Base.metadata.create_all(bind=engine)
print('Database tables created successfully!')
"
```

---

## 🚀 Step 8: Running the Application

### Method 1: Using Project Scripts

#### Make scripts executable
```bash
cd "/home/bitbuggy/Naman_Projects/Dental Attendance"
chmod +x start_project.sh
chmod +x start_backend_smart.sh
```

#### Start the complete system
```bash
./start_project.sh
```

### Method 2: Manual Startup

#### Terminal 1 - Backend
```bash
cd "/home/bitbuggy/Naman_Projects/Dental Attendance/backend"
python3 main.py
```

#### Terminal 2 - Frontend
```bash
cd "/home/bitbuggy/Naman_Projects/Dental Attendance/frontend"
npm start
```

---

## 🔧 Step 9: Verify Installation

### Check Services
```bash
# Check if backend is running
curl http://localhost:8000

# Check if frontend is accessible
curl http://localhost:3000

# Check GPU utilization during face recognition
nvidia-smi

# Test database connection
psql -h localhost -U postgres -d dental_attendance -c "SELECT version();"
```

### Test Face Recognition
1. Open browser: `http://localhost:3000`
2. Register a student with photo
3. Take attendance and verify face recognition works
4. Monitor GPU usage with `nvidia-smi`

---

## 🔒 Step 10: Security & Production Considerations

### Firewall Configuration
```bash
# Install UFW if not installed
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application ports
sudo ufw allow 3000  # Frontend
sudo ufw allow 8000  # Backend

# Enable firewall
sudo ufw enable
```

### Process Management (Optional)
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Create PM2 ecosystem file
cat << EOF > ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'dental-backend',
      script: 'python3',
      args: 'main.py',
      cwd: '/home/bitbuggy/Naman_Projects/Dental Attendance/backend',
      env: {
        PYTHONPATH: '/home/bitbuggy/Naman_Projects/Dental Attendance/backend'
      }
    },
    {
      name: 'dental-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/bitbuggy/Naman_Projects/Dental Attendance/frontend'
    }
  ]
};
EOF

# Start applications with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. CUDA/GPU Issues
```bash
# Check NVIDIA driver
nvidia-smi

# Reinstall CUDA if needed
sudo apt remove --purge cuda*
sudo apt autoremove
# Reinstall CUDA as per Step 2
```

#### 2. TensorFlow GPU Issues
```bash
# Test TensorFlow GPU
python3 -c "
import tensorflow as tf
print('TensorFlow version:', tf.__version__)
print('GPU Available:', tf.test.is_gpu_available())
print('CUDA support:', tf.test.is_built_with_cuda())
"
```

#### 3. PostgreSQL Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l

# Reset PostgreSQL password if needed
sudo -u postgres psql
ALTER USER postgres PASSWORD 'root';
\q
```

#### 4. Permission Issues
```bash
# Fix ownership of project files
sudo chown -R $(whoami):$(whoami) "/home/bitbuggy/Naman_Projects/Dental Attendance"

# Fix static directory permissions
chmod -R 755 "/home/bitbuggy/Naman_Projects/Dental Attendance/backend/static"
```

#### 5. Port Conflicts
```bash
# Check what's using port 8000
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

---

## 📊 Performance Optimization

### GPU Memory Management
```bash
# Add to backend/.env for GPU memory growth
echo "TF_FORCE_GPU_ALLOW_GROWTH=true" >> backend/.env
```

### System Monitoring
```bash
# Monitor GPU usage
watch -n 1 nvidia-smi

# Monitor system resources
htop

# Monitor disk usage
df -h
```

---

## 🔄 Daily Operations

### Starting the System
```bash
cd "/home/bitbuggy/Naman_Projects/Dental Attendance"
./start_project.sh
```

### Stopping the System
```bash
# Kill all processes
./kill_project.sh

# Or manually:
pkill -f "python3 main.py"
pkill -f "npm start"
```

### Backup Database
```bash
# Create backup
sudo -u postgres pg_dump dental_attendance > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
sudo -u postgres psql dental_attendance < backup_file.sql
```

---

## ✅ Success Checklist

- [ ] Ubuntu 22.04 updated
- [ ] NVIDIA drivers installed (`nvidia-smi` works)
- [ ] CUDA toolkit installed (`nvcc --version` works)
- [ ] Python 3.10+ with global packages installed
- [ ] PostgreSQL running and database created
- [ ] Node.js 18+ installed
- [ ] Project dependencies installed globally
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Face recognition working with GPU acceleration
- [ ] Database connections successful

---

## 📞 Support

If you encounter issues:
1. Check the logs in `backend/logs/app.log`
2. Verify GPU status with `nvidia-smi`
3. Check database connectivity
4. Ensure all services are running
5. Review the troubleshooting section above

**System URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

*Last updated: September 2025*
*Tested on: Ubuntu 22.04 LTS with NVIDIA T4*
