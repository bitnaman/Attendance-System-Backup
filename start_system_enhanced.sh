#!/bin/bash
# Smart startup script for BTech Attendance System with storage configuration

echo "🎓 BTech Attendance System - Enhanced Startup Script"
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check environment file
check_env_file() {
    local env_file="$1"
    local dir_name="$2"
    
    if [ ! -f "$env_file" ]; then
        echo "⚠️  Warning: $env_file not found in $dir_name"
        echo "   Creating from template..."
        if [ -f "${env_file}.example" ]; then
            cp "${env_file}.example" "$env_file"
            echo "   ✅ Created $env_file from template"
            echo "   📝 Please edit $env_file with your actual configuration"
            return 1
        else
            echo "   ❌ Template file ${env_file}.example not found"
            return 1
        fi
    else
        echo "   ✅ $env_file found"
        return 0
    fi
}

# Function to get storage type from backend .env
get_storage_type() {
    if [ -f "backend/.env" ]; then
        storage_type=$(grep "^PHOTO_STORAGE_TYPE=" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        echo "${storage_type:-local}"
    else
        echo "local"
    fi
}

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Make sure you can see 'backend' and 'frontend' folders"
    exit 1
fi

echo "📍 Starting from: $(pwd)"
echo ""

# Check environment files
echo "🔧 Checking environment configuration..."
backend_env_ok=0
frontend_env_ok=0

check_env_file "backend/.env" "backend" && backend_env_ok=1
check_env_file "frontend/.env" "frontend" && frontend_env_ok=1

if [ $backend_env_ok -eq 0 ] || [ $frontend_env_ok -eq 0 ]; then
    echo ""
    echo "⚠️  Environment configuration required!"
    echo "   Please edit the .env files with your actual configuration"
    echo "   and run this script again."
    exit 1
fi

# Get storage configuration
storage_type=$(get_storage_type)
echo "📁 Storage type: $storage_type"

if [ "$storage_type" = "s3" ]; then
    echo "☁️  AWS S3 storage configured"
    # Check if AWS credentials are present
    if ! grep -q "AWS_ACCESS_KEY_ID=" backend/.env || ! grep -q "AWS_SECRET_ACCESS_KEY=" backend/.env; then
        echo "⚠️  Warning: S3 storage selected but AWS credentials may not be configured"
    fi
else
    echo "🏠 Local storage configured"
fi

echo ""

# Check dependencies
echo "🔍 Checking dependencies..."

# Check Python
if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi
echo "   ✅ Python 3: $(python3 --version)"

# Check pip
if ! command_exists pip; then
    echo "❌ pip is required but not installed"
    exit 1
fi

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi
echo "   ✅ Node.js: $(node --version)"

# Check npm
if ! command_exists npm; then
    echo "❌ npm is required but not installed"
    exit 1
fi
echo "   ✅ npm: $(npm --version)"

echo ""

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "   Activating virtual environment..."
source venv/bin/activate

# Install/update Python dependencies
echo "   Installing Python dependencies..."
pip install -r requirements.txt

# Check PostgreSQL connection
echo "   Checking database connection..."
python3 -c "
try:
    from config import DATABASE_URL
    from sqlalchemy import create_engine
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    conn.close()
    print('   ✅ Database connection successful')
except Exception as e:
    print(f'   ⚠️  Database connection failed: {e}')
    print('   Please ensure PostgreSQL is running and credentials are correct')
"

cd ..

# Frontend setup
echo ""
echo "🎨 Setting up frontend..."
cd frontend

# Install Node.js dependencies
echo "   Installing Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   Dependencies already installed"
fi

cd ..

echo ""
echo "🚀 Starting services..."

# Function to start backend
start_backend() {
    echo "   Starting backend server..."
    cd backend
    source venv/bin/activate
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo "   🟢 Backend started (PID: $BACKEND_PID)"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "   Starting frontend server..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    echo "   🟢 Frontend started (PID: $FRONTEND_PID)"
    cd ..
}

# Start services
start_backend
sleep 3
start_frontend

# Create PID file for easy cleanup
echo "$BACKEND_PID" > backend_pid.txt
echo "$FRONTEND_PID" > frontend_pid.txt

echo ""
echo "🎉 BTech Attendance System started successfully!"
echo ""
echo "📍 Access URLs:"
echo "   🔗 Frontend: http://localhost:3000"
echo "   🔗 Backend API: http://localhost:8000"
echo "   🔗 API Documentation: http://localhost:8000/docs"
echo ""
echo "📁 Storage configuration: $storage_type"
if [ "$storage_type" = "s3" ]; then
    echo "   ☁️  Photos will be stored in AWS S3"
else
    echo "   🏠 Photos will be stored locally"
fi
echo ""
echo "🛑 To stop the system:"
echo "   Run: ./kill_project.sh"
echo "   Or: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📊 Monitor logs:"
echo "   Backend: tail -f backend/logs/app.log"
echo "   Frontend: Check terminal output"
echo ""
echo "🔧 Configuration files:"
echo "   Backend: backend/.env"
echo "   Frontend: frontend/.env"
echo ""

# Wait for user interruption
echo "Press Ctrl+C to stop all services..."
wait
