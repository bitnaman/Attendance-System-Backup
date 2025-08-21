#!/bin/bash
# Smart startup script for Dental Attendance Backend
# Checks TensorFlow GPU support before starting

echo "🚀 Starting Dental Attendance System Backend..."

# Check if we need to setup the environment first
if [ ! -f "setup_complete.flag" ]; then
    echo "🔍 First run detected. Checking TensorFlow GPU setup..."
    ./setup_gpu_env.sh
    
    if [ $? -eq 0 ]; then
        echo "✅" > setup_complete.flag
        echo "✅ Setup completed successfully!"
    else
        echo "⚠️  Setup had issues, but continuing with available configuration..."
    fi
fi

# Activate the tf-gpu environment if it exists
if [ -d "tf-gpu" ]; then
    echo "🔄 Activating tf-gpu environment..."
    source tf-gpu/bin/activate
fi

# Quick GPU check before starting
echo "🔍 Quick GPU status check..."
python3 -c "
try:
    import tensorflow as tf
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f'✅ GPU ready: {len(gpus)} device(s) available')
    else:
        print('ℹ️  Using CPU mode')
except:
    print('⚠️  TensorFlow check failed, but will try to start anyway')
" 2>/dev/null

# Start the backend
echo "🎯 Starting FastAPI backend..."
cd backend
python3 main.py
