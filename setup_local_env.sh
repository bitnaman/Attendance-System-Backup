#!/bin/bash

# Setup script for local development environment - CPU-only with SQLite
echo "🎓 Setting up Facial Attendance System for Local Development (CPU-only)"
echo "=============================================================="

# Create .env file for local development
cat > .env << 'EOF'
# ================================================================================================
# FACIAL ATTENDANCE SYSTEM - LOCAL DEVELOPMENT CONFIGURATION (CPU-ONLY + SQLite)
# ================================================================================================

# Database Configuration (SQLite - Local)
DB_FILE=attendance.db

# Redis Configuration (Local - Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_CACHE_EXPIRATION_SECONDS=300

# Photo Storage Configuration
PHOTO_STORAGE_TYPE=local
PHOTO_STORAGE_PATH=./backend/static
BACKEND_BASE_URL=http://localhost:8000

# Face Recognition Configuration (CPU-optimized)
FACE_RECOGNITION_MODEL=Facenet512
FACE_DETECTOR_BACKEND=opencv
FACE_DISTANCE_THRESHOLD=16.0
ADAPTIVE_THRESHOLD_MODE=enabled

# Performance Configuration (CPU-only)
COMPUTE_MODE=cpu
ENABLE_ASYNC_PROCESSING=true
BATCH_SIZE=1
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

# Initialize SQLite database
echo ""
echo "🔍 Initializing SQLite database..."
python3 -c "
import sys, os
sys.path.append('backend')
try:
    from backend.database import init_fresh_db
    init_fresh_db()
    print('✅ Database initialized successfully!')
except Exception as e:
    print(f'❌ Database initialization failed: {e}')
    sys.exit(1)
"

echo ""
echo "🚀 Setup complete! You can now:"
echo "   1. Start the backend: python3 backend/main.py"
echo "   2. Start the frontend: cd frontend && npm start"
echo "   3. Go to http://localhost:3000"
echo ""
echo "📝 If you need to create a superadmin user, run:"
echo "   python3 create_admin.py"
