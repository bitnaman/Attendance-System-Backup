#!/bin/bash
# Smart Setup script for TensorFlow GPU environment
# For Dental Attendance System - Only installs if needed

echo "� Checking current TensorFlow GPU setup..."

# Function to test TensorFlow GPU
test_tensorflow_gpu() {
    python3 -c "
import sys
try:
    import tensorflow as tf
    print('✅ TensorFlow found, version:', tf.__version__)
    
    # Test GPU detection
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f'✅ GPU(s) detected: {len(gpus)} device(s)')
        for i, gpu in enumerate(gpus):
            print(f'   GPU {i}: {gpu.name}')
        
        # Test GPU computation
        try:
            with tf.device('/GPU:0'):
                a = tf.constant([[1.0, 2.0], [3.0, 4.0]])
                b = tf.constant([[1.0, 2.0], [3.0, 4.0]])
                c = tf.matmul(a, b)
            print('✅ GPU computation test: PASSED')
            print('🎉 TensorFlow GPU is working perfectly! No setup needed.')
            sys.exit(0)
        except Exception as e:
            print(f'❌ GPU computation test failed: {e}')
            sys.exit(1)
    else:
        print('⚠️  No GPU detected by TensorFlow')
        sys.exit(1)
except ImportError:
    print('❌ TensorFlow not found')
    sys.exit(1)
except Exception as e:
    print(f'❌ TensorFlow test failed: {e}')
    sys.exit(1)
" 2>/dev/null
}

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "� Currently in virtual environment: $VIRTUAL_ENV"
    if test_tensorflow_gpu; then
        echo "🎉 Everything is already working! No setup needed."
        exit 0
    fi
else
    echo "📍 Not in a virtual environment, checking system Python..."
    if test_tensorflow_gpu; then
        echo "🎉 System TensorFlow GPU is working! No setup needed."
        exit 0
    fi
fi

echo ""
echo "🔧 TensorFlow GPU setup needed. Proceeding with installation..."

# Check if tf-gpu environment already exists
if [ -d "tf-gpu" ]; then
    echo "📦 tf-gpu environment exists, activating..."
    source tf-gpu/bin/activate
    
    # Test again in the existing environment
    if test_tensorflow_gpu; then
        echo "🎉 Existing tf-gpu environment is working! No setup needed."
        exit 0
    fi
    echo "🔄 Existing environment needs updates..."
else
    echo "📦 Creating new virtual environment 'tf-gpu'..."
    python3 -m venv tf-gpu
    source tf-gpu/bin/activate
fi

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing dependencies from requirements.txt..."
cd backend
pip install -r requirements.txt

echo ""
echo "🔍 Final TensorFlow GPU test..."
if test_tensorflow_gpu; then
    echo "✅ Setup complete and working!"
else
    echo "❌ Setup completed but GPU test failed. Check your CUDA installation."
    echo "💡 The system will work with CPU, but will be slower."
fi

echo ""
echo "💡 To use this environment in the future:"
echo "   source tf-gpu/bin/activate"
echo "   cd backend"
echo "   python main.py"
