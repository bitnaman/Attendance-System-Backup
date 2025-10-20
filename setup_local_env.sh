#!/bin/bash

# Setup script for local development environment
echo "🎓 Setting up Facial Attendance System for Local Development"
echo "=============================================================="

# Create .env file for local development
cat > .env << 'EOF'
# ================================================================================================
# FACIAL ATTENDANCE SYSTEM - LOCAL DEVELOPMENT CONFIGURATION
# ================================================================================================

# Database Configuration (PostgreSQL - Local)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dental_attendance
POSTGRES_USER=dental_user
POSTGRES_PASSWORD=root

# Redis Configuration (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_CACHE_EXPIRATION_SECONDS=300

# Photo Storage Configuration
PHOTO_STORAGE_TYPE=local
PHOTO_STORAGE_PATH=./backend/static
BACKEND_BASE_URL=http://localhost:8000

# Face Recognition Configuration
FACE_RECOGNITION_MODEL=ArcFace
FACE_DETECTOR_BACKEND=mtcnn
FACE_DISTANCE_THRESHOLD=18.0
ADAPTIVE_THRESHOLD_MODE=disabled

# Performance Configuration
COMPUTE_MODE=auto
TF_FORCE_GPU_ALLOW_GROWTH=true
CUDA_VISIBLE_DEVICES=0
ENABLE_ASYNC_PROCESSING=true
BATCH_SIZE=32
MAX_WORKERS=4

# Feature Flags
LOAD_BALANCER_ENABLED=false
MONITORING_ENABLED=true
PREDICTIVE_ANALYTICS_ENABLED=false

# Logging Configuration
LOG_LEVEL=INFO
LOG_THROTTLE_MS=1000

# Frontend Configuration
REACT_APP_API_BASE=http://localhost:8000
REACT_APP_PHOTO_BASE=http://localhost:8000

# Authentication Configuration
AUTH_SECRET_KEY=your-secret-key-change-this-in-production-$(date +%s)
ACCESS_TOKEN_EXPIRE_MINUTES=480
EOF

echo "✅ Created .env file for local development"

# Test database connection
echo ""
echo "🔍 Testing database connection..."
python3 -c "
import sys, os
sys.path.append('backend')
from backend.database import SessionLocal

try:
    db = SessionLocal()
    db.execute('SELECT 1')
    print('✅ Database connection successful!')
    db.close()
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    print('💡 Make sure PostgreSQL is running and the database exists')
"

echo ""
echo "🚀 Setup complete! You can now:"
echo "   1. Start the backend: python3 backend/main.py"
echo "   2. Start the frontend: cd frontend && npm start"
echo "   3. Go to http://localhost:3000"
echo ""
echo "📝 If you need to create a superadmin user, run:"
echo "   python3 create_admin.py"
