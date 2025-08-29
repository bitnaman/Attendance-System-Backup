# 🔄 Storage & Database Switching Guide

This guide helps you switch between Local and Cloud deployment modes.

## 📁 Current Mode: LOCAL DEVELOPMENT

Your application is currently configured for **local development**:
- **Storage**: Local filesystem (`backend/static/`)
- **Database**: Local PostgreSQL (`localhost`)

## 🚀 To Switch to Cloud Deployment (Production Mode)

### Step 1: Setup Cloud Database

Choose one of these options:

#### Option A: AWS RDS PostgreSQL (Recommended)
1. Create RDS PostgreSQL instance in AWS
2. Note down: endpoint, username, password
3. Update database section in `backend/.env`

#### Option B: Self-hosted PostgreSQL
1. Install PostgreSQL on your cloud server
2. Configure remote access and security
3. Update database section in `backend/.env`

#### Option C: Other Cloud Providers
- Google Cloud SQL, Azure Database, DigitalOcean, Heroku Postgres, etc.

### Step 2: Migrate Database (Optional)

If you want to keep existing student data:

```bash
# Export your current local database
pg_dump -h localhost -U postgres dental_attendance > dental_attendance_backup.sql

# Import to cloud database
psql -h your-cloud-host -U postgres dental_attendance < dental_attendance_backup.sql
```

### Step 3: Update Backend Configuration (`backend/.env`)

```bash
# Comment out LOCAL sections and uncomment CLOUD sections:

# LOCAL STORAGE (comment out):
# PHOTO_STORAGE_TYPE=local
# BACKEND_BASE_URL=http://localhost:8000

# S3 STORAGE (uncomment and configure):
PHOTO_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
BACKEND_BASE_URL=https://api.yourdomain.com

# LOCAL DATABASE (comment out):
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_DB=dental_attendance
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=root

# CLOUD DATABASE (uncomment and configure):
POSTGRES_HOST=your-cloud-db-host
POSTGRES_PORT=5432
POSTGRES_DB=dental_attendance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
```

### Step 4: Update Frontend Configuration (`frontend/.env`)

```bash
# Comment out LOCAL STORAGE section:
# REACT_APP_API_BASE=http://localhost:8000
# REACT_APP_PHOTO_BASE=http://localhost:8000

# Uncomment and configure CLOUD STORAGE section:
REACT_APP_API_BASE=https://api.yourdomain.com
REACT_APP_PHOTO_BASE=https://your-bucket-name.s3.us-east-1.amazonaws.com
```

### Step 5: Deploy and Restart Application

```bash
# Deploy to your cloud server and start services
python main.py  # Backend with cloud database and S3
npm start       # Frontend with cloud API endpoints
```

## 🏠 To Switch Back to Local Development

Simply reverse the process - comment out cloud sections and uncomment local sections in the `.env` files.

## 📊 Deployment Combinations

| Storage | Database | Use Case |
|---------|----------|----------|
| Local | Local | Development |
| Local | Cloud | Hybrid testing |
| S3 | Local | Storage testing |
| S3 | Cloud | Full production |

## 📋 Migration Strategies

### Fresh Start (Recommended for Clean Production)
- Setup cloud database and S3
- Switch configurations
- Register students fresh in production

### Migrate Existing Data
- Export local database → Import to cloud
- Run `python migrate_to_s3.py --force` for photos
- Switch configurations

---

**Note**: Your application automatically detects the storage and database configurations. No code changes needed - just environment configuration!
