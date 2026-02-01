# ===========================================
# PRODUCTION DEPLOYMENT & UPDATE GUIDE
# Facial Attendance System
# ===========================================

## 📋 Overview

This guide explains how to deploy and update your facial attendance system in production without losing user data or causing downtime. We've moved beyond simple "git clone and deploy" to implement production-grade deployment practices.

## 🏗️ Architecture Overview

### Current Setup (Testing)
```
Git Clone → Manual Start → Direct Usage
```

### Production Setup (Recommended)
```
Code Repository → Automated Deployment → Zero-Downtime Updates → Data Persistence
```

## 🔄 Deployment Workflow

### 1. **Initial Production Setup**

#### On Azure VM:
```bash
# 1. Create deployment directory structure
mkdir -p /home/ubuntu/backups
mkdir -p /var/log
sudo touch /var/log/facial-attendance-system_deployment.log
sudo touch /var/log/facial-attendance-system_backend.log
sudo touch /var/log/facial-attendance-system_frontend.log
sudo chown ubuntu:ubuntu /var/log/facial-attendance-system_*

# 2. Clone repository
cd /home/ubuntu
git clone https://github.com/your-username/facial-attendance-system.git
cd facial-attendance-system

# 3. Make deployment script executable
chmod +x deploy.sh

# 4. Create production environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.production

# 5. Configure environment variables
nano .env  # Set your production values
nano frontend/.env.production  # Set REACT_APP_API_BASE=http://20.25.74.210:8000
```

#### Environment Configuration:
```bash
# .env (Backend)
JWT_SECRET_KEY=your-production-jwt-secret-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_TYPE=sqlite
DB_FILE=attendance.db
STORAGE_TYPE=local

# frontend/.env.production (Frontend)
REACT_APP_API_BASE=http://20.25.74.210:8000
REACT_APP_PHOTO_BASE=http://20.25.74.210:8000
REACT_APP_NAME=Bharati Facify
REACT_APP_VERSION=2.0.0
```

### 2. **Initial Deployment**

```bash
# Run initial deployment
./deploy.sh
```

This will:
- ✅ Install dependencies
- ✅ Build frontend
- ✅ Initialize database
- ✅ Start services
- ✅ Run health checks

### 3. **Production Updates (Zero-Downtime)**

When you have new features/fixes:

```bash
# On your development machine
git add .
git commit -m "Add new feature: attendance analytics"
git push origin main

# On Azure VM
./deploy.sh
```

The deployment script automatically:
1. 🔍 **Pre-checks**: Disk space, service status
2. 💾 **Backup**: Database, photos, configurations
3. 🛑 **Graceful shutdown**: Stop services cleanly
4. 📥 **Update code**: Git pull latest changes
5. 📦 **Update dependencies**: pip install, npm install
6. 🗄️ **Migrate database**: Add new columns safely
7. 🩺 **Health checks**: Verify everything works
8. 🚀 **Start services**: Backend + Frontend
9. ✅ **Verify deployment**: API + UI tests
10. 🧹 **Cleanup**: Remove old backups

## 🔒 Data Protection Strategies

### 1. **Database Persistence**

Your SQLite database (`attendance.db`) contains:
- Student records & photos
- Attendance history
- User accounts
- Subject information

**Protection Methods:**
- ✅ Automatic backup before each update
- ✅ Safe migrations (additive only)
- ✅ Rollback capability
- ✅ 7-day backup retention

### 2. **File Storage Persistence**

Static files in `backend/static/`:
```
student_photos/     # Face recognition photos
attendance_photos/  # Session photos
uploads/           # Temporary uploads
exports/           # Generated reports
medical_documents/ # Medical certificates
```

**Protection Methods:**
- ✅ Full backup before updates
- ✅ Separate from code repository
- ✅ Preserved during rollbacks

### 3. **Configuration Persistence**

Environment files (`.env`, `.env.production`) contain:
- Database credentials
- JWT secrets
- API keys
- Storage configurations

**Protection Methods:**
- ✅ Excluded from git (via .gitignore)
- ✅ Backed up before updates
- ✅ Manually maintained on server

## 🔄 Update Scenarios

### Scenario 1: Bug Fix
```bash
# Development
git commit -m "Fix: Student photo upload validation"
git push origin main

# Production (Azure VM)
./deploy.sh
```
**Result**: 
- ✅ Code updated
- ✅ No data loss
- ✅ Services restarted
- ✅ ~30 second downtime

### Scenario 2: New Feature
```bash
# Development
git commit -m "Feature: Attendance analytics dashboard"
git push origin main

# Production (Azure VM)
./deploy.sh
```
**Result**:
- ✅ New frontend components
- ✅ New backend APIs
- ✅ Database schema updated (if needed)
- ✅ All existing data preserved

### Scenario 3: Database Schema Change
```python
# If you add new columns in database.py
class Student(Base):
    # ... existing fields ...
    new_field = Column(String(100))  # New field added

# Update migrations.py
def run_light_migrations(engine):
    # ... existing migrations ...
    _add_column_if_missing(conn, "students", "new_field", "TEXT")
```

**Result**:
- ✅ New column added safely
- ✅ Existing data unchanged
- ✅ No data loss

## 🚨 Disaster Recovery

### If Deployment Fails:
```bash
# Automatic rollback
./deploy.sh  # If this fails, it auto-rolls back

# Manual rollback
./deploy.sh rollback
```

### If Database is Corrupted:
```bash
# List available backups
ls -la /home/ubuntu/backups/

# Restore from specific backup
cp /home/ubuntu/backups/20260130_143022/attendance.db backend/
cp -r /home/ubuntu/backups/20260130_143022/static backend/
```

### If Server Goes Down:
```bash
# Check service status
ps aux | grep -E "(main.py|http.server)"

# Restart services manually
cd /home/ubuntu/facial-attendance-system
./deploy.sh
```

## 🔧 Monitoring & Maintenance

### 1. **Log Monitoring**
```bash
# Watch deployment logs
tail -f /var/log/facial-attendance-system_deployment.log

# Watch backend logs
tail -f /var/log/facial-attendance-system_backend.log

# Watch frontend logs
tail -f /var/log/facial-attendance-system_frontend.log
```

### 2. **Health Checks**
```bash
# Backend health
curl http://20.25.74.210:8000/health

# Frontend health
curl http://20.25.74.210:3000

# Database check
cd backend && python -c "from database import engine; print('✅ DB OK' if engine.connect() else '❌ DB Error')"
```

### 3. **Backup Management**
```bash
# List backups
ls -la /home/ubuntu/backups/

# Manual backup
timestamp=$(date '+%Y%m%d_%H%M%S')
mkdir -p /home/ubuntu/backups/manual_$timestamp
cp backend/attendance.db /home/ubuntu/backups/manual_$timestamp/
cp -r backend/static /home/ubuntu/backups/manual_$timestamp/
```

## 📊 Production vs Testing Differences

| Aspect | Testing (Current) | Production (Recommended) |
|--------|------------------|--------------------------|
| **Deployment** | `git clone` + manual start | Automated script with checks |
| **Updates** | `git pull` + restart | Zero-downtime deployment |
| **Data Safety** | No backups | Automatic backups |
| **Rollback** | Manual | Automated |
| **Monitoring** | None | Logs + health checks |
| **Downtime** | Uncontrolled | Minimal (~30 seconds) |

## 🚀 Next Steps

### Immediate Actions:
1. **Set up production environment** on Azure VM
2. **Run initial deployment** with `./deploy.sh`
3. **Create your first admin user**
4. **Test the update process** with a small change

### Advanced Improvements (Future):
1. **Database Migration to PostgreSQL** for better scalability
2. **Load Balancer** for multiple server instances
3. **S3 Integration** for cloud file storage
4. **Docker Containerization** for easier deployments
5. **CI/CD Pipeline** with GitHub Actions

## ⚡ Quick Reference

### Essential Commands:
```bash
# Deploy/Update
./deploy.sh

# Rollback if needed
./deploy.sh rollback

# Check services
ps aux | grep -E "(main.py|http.server)"

# View logs
tail -f /var/log/facial-attendance-system_deployment.log

# Manual restart
cd backend && nohup python main.py &
cd frontend/build && nohup python3 -m http.server 3000 --bind 0.0.0.0 &
```

### Emergency Contacts:
- **Backend URL**: http://20.25.74.210:8000
- **Frontend URL**: http://20.25.74.210:3000
- **SSH Access**: `ssh -i your-key ubuntu@20.25.74.210`
- **Backup Location**: `/home/ubuntu/backups/`

---

This production deployment strategy ensures your facial attendance system can be updated safely without losing student data, attendance records, or photos. The automated deployment script handles all the complexity while maintaining system reliability.