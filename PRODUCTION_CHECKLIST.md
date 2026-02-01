# 🚀 PRODUCTION DEPLOYMENT CHECKLIST
# Facial Attendance System

## 📋 Pre-Deployment Setup (One-time on Azure VM)

### 1. Initial Environment Setup
```bash
# Create directories
mkdir -p /home/ubuntu/backups
mkdir -p /var/log
sudo touch /var/log/facial-attendance-system_deployment.log
sudo touch /var/log/facial-attendance-system_backend.log
sudo touch /var/log/facial-attendance-system_frontend.log
sudo chown ubuntu:ubuntu /var/log/facial-attendance-system_*

# Clone repository
cd /home/ubuntu
git clone https://github.com/your-username/facial-attendance-system.git
cd facial-attendance-system

# Make scripts executable
chmod +x deploy.sh deploy-v2.sh
```

### 2. Environment Configuration
```bash
# Backend environment
cp .env.example .env
nano .env

# Frontend environment  
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production
```

**Required .env values:**
```
JWT_SECRET_KEY=cec58f02091d6c26d58b93a75ff6fb22ecba27dc1e34f4593b2d74631c481b88
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_TYPE=sqlite
DB_FILE=attendance.db
STORAGE_TYPE=local
```

**Required frontend/.env.production values:**
```
REACT_APP_API_BASE=http://20.25.74.210:8000
REACT_APP_PHOTO_BASE=http://20.25.74.210:8000
```

### 3. Initial Deployment
```bash
# Choose deployment method:

# Option A: Advanced (Systemd services - Recommended)
./deploy-v2.sh systemd

# Option B: Simple (Manual processes)
./deploy-v2.sh manual
```

## 🔄 Regular Updates (Production Operations)

### When You Have New Features/Fixes:

#### Step 1: Development
```bash
# On your local machine
git add .
git commit -m "Feature: New attendance analytics"
git push origin main
```

#### Step 2: Production Update
```bash
# SSH to Azure VM
ssh -i your-key ubuntu@20.25.74.210

# Navigate to project
cd facial-attendance-system

# Deploy update
./deploy-v2.sh
```

**What the deployment does automatically:**
1. ✅ **Backup** - Database + photos + configs
2. ✅ **Stop Services** - Graceful shutdown
3. ✅ **Update Code** - Git pull latest
4. ✅ **Dependencies** - pip install, npm install
5. ✅ **Database Migration** - Safe column additions
6. ✅ **Health Checks** - Verify everything works
7. ✅ **Start Services** - Backend + Frontend
8. ✅ **Verification** - API + UI tests

**Result: ~30 seconds downtime, zero data loss**

## 🎯 Production Access Points

### User Access:
- **Frontend**: http://20.25.74.210:3000
- **Login**: Create admin account on first visit

### Admin Monitoring:
- **Backend API**: http://20.25.74.210:8000/docs
- **Health Check**: http://20.25.74.210:8000/health
- **System Info**: http://20.25.74.210:8000/system-info

## 🔧 Service Management Commands

### Systemd Services (Recommended):
```bash
# Check status
systemctl --user status facial-attendance-backend.service
systemctl --user status facial-attendance-frontend.service

# Start/Stop/Restart
systemctl --user start facial-attendance-backend.service
systemctl --user stop facial-attendance-frontend.service
systemctl --user restart facial-attendance-backend.service

# View logs
journalctl --user -u facial-attendance-backend.service -f
journalctl --user -u facial-attendance-frontend.service -f
```

### Deployment Script Commands:
```bash
# Full deployment
./deploy-v2.sh

# Service management
./deploy-v2.sh start
./deploy-v2.sh stop  
./deploy-v2.sh restart
./deploy-v2.sh status

# Emergency rollback
./deploy-v2.sh rollback
```

## 🚨 Emergency Procedures

### If Deployment Fails:
```bash
# Automatic rollback happens, but manual:
./deploy-v2.sh rollback
```

### If Services Won't Start:
```bash
# Check logs
tail -f /var/log/facial-attendance-system_backend.log
tail -f /var/log/facial-attendance-system_frontend.log

# Check permissions
ls -la /home/ubuntu/facial-attendance-system/backend/attendance.db
```

### If Database is Corrupted:
```bash
# List backups
ls -la /home/ubuntu/backups/

# Restore from backup
cp /home/ubuntu/backups/20260130_143022/attendance.db backend/
cp -r /home/ubuntu/backups/20260130_143022/static backend/

# Restart
./deploy-v2.sh restart
```

## 📊 Data Protection Summary

### What is Automatically Backed Up:
- ✅ SQLite database (`attendance.db`)
- ✅ Student photos (`backend/static/student_photos/`)  
- ✅ Attendance photos (`backend/static/attendance_photos/`)
- ✅ Environment configs (`.env`, `.env.production`)
- ✅ Git commit information

### What is Preserved During Updates:
- ✅ Student records and face encodings
- ✅ Attendance history
- ✅ User accounts and permissions
- ✅ All uploaded photos and documents
- ✅ System configurations

### What is Protected from Git:
- ✅ `.env` files (secrets, passwords)
- ✅ `.env.production` (server-specific configs)
- ✅ Database files
- ✅ Uploaded photos
- ✅ Generated reports

## 🎯 Success Indicators

### Deployment Successful When:
1. ✅ Health check returns `{"status": "healthy"}`
2. ✅ Frontend loads at http://20.25.74.210:3000
3. ✅ Backend API docs at http://20.25.74.210:8000/docs
4. ✅ Can login with existing admin account
5. ✅ Student photos display correctly
6. ✅ Attendance marking works

### Rollback Required When:
- ❌ Health check fails
- ❌ Database connection error
- ❌ Frontend won't load
- ❌ API returns 500 errors
- ❌ Face recognition fails

## 🔮 Advanced Features (Future)

### Next Level Improvements:
1. **PostgreSQL Migration** - Better for >100 students
2. **S3 Storage** - Cloud photo storage
3. **Docker Containers** - Easier deployments
4. **Load Balancer** - Multiple server instances
5. **CI/CD Pipeline** - Automated testing + deployment

### Current Limitations:
- SQLite (good for <1000 students)
- Single server instance
- Local photo storage
- Manual SSH deployment

---

**🎉 You now have production-grade deployment with data protection!**

Your facial attendance system can be safely updated without losing student data, attendance records, or photos. The automated deployment script handles all the complexity while maintaining system reliability.