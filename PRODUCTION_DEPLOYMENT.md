# 🚀 Production Deployment Guide with S3 Storage

## Prerequisites

1. **AWS Account** with S3 access
2. **Domain/Server** for hosting the application
3. **PostgreSQL Database** (AWS RDS recommended for production)

## Deployment Steps

### Step 1: AWS S3 Setup

```bash
# Run the S3 setup script
./setup_s3.sh

# Or manually create bucket and set permissions
aws s3 mb s3://btech-attendance-photos --region us-east-1
aws s3api put-bucket-policy --bucket btech-attendance-photos --policy file://bucket-policy.json
```

### Step 2: Backend Configuration

Update `backend/.env`:

```bash
# Storage Configuration
PHOTO_STORAGE_TYPE=s3

# AWS S3 Settings
AWS_ACCESS_KEY_ID=AKIA...your_key
AWS_SECRET_ACCESS_KEY=xyz...your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=btech-attendance-photos

# Production Database
POSTGRES_HOST=your-rds-endpoint.region.rds.amazonaws.com
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=dental_attendance

# Production Backend URL
BACKEND_BASE_URL=https://api.yourdomain.com
```

### Step 3: Frontend Configuration

Update `frontend/.env`:

```bash
# Production API URL
REACT_APP_API_BASE=https://api.yourdomain.com

# S3 Photo Base URL
REACT_APP_PHOTO_BASE=https://btech-attendance-photos.s3.us-east-1.amazonaws.com
```

### Step 4: Migration (If Existing Local Data)

```bash
# Migrate existing photos to S3
python migrate_to_s3.py --dry-run  # Test first
python migrate_to_s3.py --force    # Actual migration
```

### Step 5: Build and Deploy

```bash
# Backend deployment
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend deployment
cd frontend
npm install
npm run build
# Deploy build folder to your web server
```

## Common Deployment Scenarios

### Scenario 1: Single Server Deployment

```nginx
# Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Update frontend config:
```bash
REACT_APP_API_BASE=https://yourdomain.com/api
```

### Scenario 2: Separate Backend/Frontend Servers

Backend server:
```bash
BACKEND_BASE_URL=https://api.yourdomain.com
```

Frontend server:
```bash
REACT_APP_API_BASE=https://api.yourdomain.com
```

### Scenario 3: AWS EC2 with Load Balancer

Use AWS Application Load Balancer with:
- Backend target group (port 8000)
- Frontend target group (port 80/443)
- Route rules based on path (`/api/*` → backend)

## Environment Variables Summary

### Must Change for S3 Deployment:

**Backend `.env`:**
- `PHOTO_STORAGE_TYPE=s3` ← **CRITICAL**
- `AWS_ACCESS_KEY_ID=...` ← **REQUIRED**
- `AWS_SECRET_ACCESS_KEY=...` ← **REQUIRED**
- `S3_BUCKET_NAME=...` ← **REQUIRED**
- `BACKEND_BASE_URL=...` ← **UPDATE WITH YOUR DOMAIN**

**Frontend `.env`:**
- `REACT_APP_API_BASE=...` ← **UPDATE WITH YOUR BACKEND URL**
- `REACT_APP_PHOTO_BASE=https://your-bucket.s3.region.amazonaws.com` ← **REQUIRED**

## Security Considerations

1. **IAM User**: Create dedicated IAM user with S3-only permissions
2. **Environment Variables**: Never commit real credentials to git
3. **HTTPS**: Use SSL certificates for production
4. **Database**: Use strong passwords and connection encryption
5. **CORS**: Restrict origins to your actual domain

## Testing Deployment

1. **Backend Health Check**: `GET https://api.yourdomain.com/docs`
2. **Frontend Loading**: Visit your domain
3. **Photo Upload**: Test student registration
4. **S3 Integration**: Verify photos appear in S3 bucket
5. **Attendance Marking**: Test with classroom photo

## Troubleshooting

### Common Issues:

1. **Photos not loading**: Check `REACT_APP_PHOTO_BASE` URL
2. **S3 access denied**: Verify IAM permissions and bucket policy
3. **CORS errors**: Check S3 CORS configuration
4. **Backend connection**: Verify `REACT_APP_API_BASE` URL

### Debug Commands:

```bash
# Test S3 connectivity
aws s3 ls s3://your-bucket-name

# Check backend logs
tail -f backend/logs/app.log

# Test API endpoints
curl https://api.yourdomain.com/student/classes
```
