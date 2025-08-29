# 🚀 BTech Attendance System - Environment Configuration & Deployment Guide

## Overview

The BTech Attendance System now supports flexible deployment configurations with environment-based photo storage and enhanced logging. This guide covers how to configure and deploy the system with different storage backends.

## 📋 Environment Variables

### Backend Configuration

#### Database Settings
```bash
POSTGRES_HOST=localhost          # PostgreSQL server host
POSTGRES_PORT=5432              # PostgreSQL server port
POSTGRES_DB=dental_attendance   # Database name
POSTGRES_USER=postgres          # Database username
POSTGRES_PASSWORD=your_password # Database password
```

#### Photo Storage Configuration
```bash
# Storage Type: "local" or "s3"
PHOTO_STORAGE_TYPE=local
```

**Local Storage (Default)**
- Photos stored on local filesystem under `/backend/static/`
- Suitable for single-server deployments
- No additional cloud costs

**S3 Cloud Storage**
- Photos stored in AWS S3 bucket
- Suitable for scalable, distributed deployments
- Requires AWS account and S3 bucket

#### AWS S3 Configuration (Required only for S3 storage)
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
```

#### Backend URL Configuration
```bash
# For local development
BACKEND_BASE_URL=http://localhost:8000

# For production deployment
BACKEND_BASE_URL=https://your-domain.com
# or
BACKEND_BASE_URL=http://your-server-ip:8000
```

### Frontend Configuration

```bash
# Backend API URL
REACT_APP_API_BASE=http://localhost:8000

# Photo base URL (depends on storage type)
# For local storage:
REACT_APP_PHOTO_BASE=http://localhost:8000

# For S3 storage:
REACT_APP_PHOTO_BASE=https://your-bucket.s3.region.amazonaws.com
```

## 🏗️ Deployment Scenarios

### 1. Local Development Setup

**Backend (.env)**
```bash
PHOTO_STORAGE_TYPE=local
POSTGRES_HOST=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
BACKEND_BASE_URL=http://localhost:8000
```

**Frontend (.env)**
```bash
REACT_APP_API_BASE=http://localhost:8000
REACT_APP_PHOTO_BASE=http://localhost:8000
```

### 2. Single Server Deployment (Local Storage)

**Backend (.env)**
```bash
PHOTO_STORAGE_TYPE=local
POSTGRES_HOST=localhost
POSTGRES_USER=production_user
POSTGRES_PASSWORD=secure_password
BACKEND_BASE_URL=https://your-domain.com
```

**Frontend (.env)**
```bash
REACT_APP_API_BASE=https://your-domain.com
REACT_APP_PHOTO_BASE=https://your-domain.com
```

### 3. Cloud Deployment with S3 Storage

**Backend (.env)**
```bash
PHOTO_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xyz...
AWS_REGION=us-east-1
S3_BUCKET_NAME=btech-attendance-photos
POSTGRES_HOST=rds-endpoint.amazonaws.com
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
BACKEND_BASE_URL=https://api.your-domain.com
```

**Frontend (.env)**
```bash
REACT_APP_API_BASE=https://api.your-domain.com
REACT_APP_PHOTO_BASE=https://btech-attendance-photos.s3.us-east-1.amazonaws.com
```

## 🔧 Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend/

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations (if needed)
python migrations.py

# Start the backend server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# For development
npm start

# For production build
npm run build
```

### 3. AWS S3 Setup (If using S3 storage)

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://your-bucket-name --region us-east-1
   ```

2. **Set Bucket Policy for Public Read Access**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

3. **Create IAM User with S3 Permissions**
   - Create IAM user for the application
   - Attach policy with S3 read/write permissions
   - Generate access keys for the user

4. **Configure CORS (if needed)**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

## 🔍 Logging & Monitoring

The enhanced logging system provides comprehensive request/response logging:

- **HTTP Requests**: Method, URL, client IP, user agent
- **Response Status**: Success/error status codes with emojis
- **Processing Time**: Request processing duration
- **Exception Handling**: Full stack traces for errors
- **Storage Operations**: File upload/download logging

Log files are stored in `backend/logs/app.log` with automatic rotation.

## 📊 Storage Comparison

| Feature | Local Storage | S3 Storage |
|---------|---------------|------------|
| Setup Complexity | Simple | Moderate |
| Scalability | Limited | High |
| Cost | Free | Pay-per-use |
| Backup | Manual | Automatic |
| CDN Support | No | Yes |
| Multi-region | No | Yes |

## 🔐 Security Considerations

### Local Storage
- Ensure proper file permissions
- Regular backups
- SSL/HTTPS for production

### S3 Storage
- Use IAM roles with minimal permissions
- Enable S3 versioning
- Consider S3 encryption
- Monitor access logs

## 🐛 Troubleshooting

### Common Issues

1. **S3 Access Denied**
   - Verify AWS credentials
   - Check IAM permissions
   - Confirm bucket policy

2. **Photo URLs Not Loading**
   - Check REACT_APP_PHOTO_BASE configuration
   - Verify CORS settings for S3
   - Check network connectivity

3. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check connection string
   - Confirm database exists

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=DEBUG
```

This provides detailed logs for troubleshooting storage and face recognition issues.

## 📝 Migration Between Storage Types

### From Local to S3

1. Set up S3 bucket and credentials
2. Update environment variables
3. Upload existing photos to S3:
   ```python
   # Run migration script (to be created)
   python migrate_to_s3.py
   ```
4. Update database photo URLs
5. Restart application

### From S3 to Local

1. Download photos from S3
2. Update environment variables
3. Update database photo URLs
4. Restart application

## 🔄 Backup Strategies

### Local Storage
- Regular filesystem backups
- Database backups
- Sync to cloud storage

### S3 Storage
- S3 versioning enabled
- Cross-region replication
- Database backups only

---

For additional support or questions, check the project documentation or raise an issue in the repository.
