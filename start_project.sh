#!/bin/bash
# Start Project Script - Starts the complete Dental Attendance System
# Includes backend with GPU acceleration and frontend

echo "🚀 Starting Dental Attendance System..."

# Check if kill script exists and run it first to ensure clean start
if [ -f "kill_project.sh" ]; then
    echo "🧹 Running cleanup first..."
    ./kill_project.sh
    echo ""
    sleep 2
fi

# Navigate to project directory
cd /home/bitbuggy/Naman_Projects/Dental\ Attendance

echo "🔍 Pre-flight checks..."

# Check if required directories exist
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found!"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found!"
    exit 1
fi

# Check Python and Node versions
echo "📋 Environment check..."
python3 --version
node --version 2>/dev/null || echo "⚠️  Node.js not found - frontend may not work"
npm --version 2>/dev/null || echo "⚠️  NPM not found - frontend may not work"

echo ""
echo "🔧 Starting Backend with GPU acceleration..."

# Start backend
cd backend
echo "📦 Checking backend dependencies..."

# Quick dependency check
python3 -c "
try:
    import tensorflow as tf
    import fastapi
    import uvicorn
    from deepface import DeepFace
    print('✅ All backend dependencies available')
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f'✅ GPU ready: {len(gpus)} device(s)')
    else:
        print('ℹ️  CPU mode')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    exit(1)
" || {
    echo "❌ Backend dependencies missing. Installing..."
    pip install -r requirements.txt
}

echo "🎯 Starting backend server..."
nohup python3 main.py > backend.log 2>&1 &
backend_pid=$!
echo "Backend PID: $backend_pid"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# Check if backend started successfully
if ! curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo ""
    echo "❌ Backend failed to start. Check logs:"
    tail -10 backend.log
    echo ""
    echo "🔍 For detailed logs: tail -f backend/backend.log"
    exit 1
fi

echo ""
echo "🎨 Starting Frontend..."

# Start frontend
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🎯 Starting React development server..."
nohup npm start > frontend.log 2>&1 &
frontend_pid=$!
echo "Frontend PID: $frontend_pid"

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
for i in {1..60}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "🎉 Dental Attendance System Started Successfully!"
echo ""
echo "📊 System Status:"
echo "=================="

# Backend status
backend_status=$(curl -s http://localhost:8000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend: Running on http://localhost:8000"
    echo "   GPU Status: $(echo $backend_status | grep -o '"gpu_[^"]*":[^,}]*' | head -1)"
else
    echo "❌ Backend: Failed to start"
fi

# Frontend status
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend: Running on http://localhost:3000"
else
    echo "❌ Frontend: Failed to start"
fi

echo ""
echo "🌐 Access URLs:"
echo "==============="
echo "🎨 Main Application: http://localhost:3000"
echo "🔧 API Backend: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "❤️  Health Check: http://localhost:8000/health"
echo ""
echo "📝 Logs:"
echo "========="
echo "Backend: tail -f backend/backend.log"
echo "Frontend: tail -f frontend/frontend.log"
echo ""
echo "🛑 To stop everything: ./kill_project.sh"
echo ""

# Store PIDs for reference
echo "Backend PID: $backend_pid" > project_pids.txt
echo "Frontend PID: $frontend_pid" >> project_pids.txt
echo "💾 Process IDs saved to project_pids.txt"
