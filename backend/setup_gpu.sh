#!/bin/bash
# Setup GPU environment for TensorFlow

# Activate virtual environment
source ~/tf-gpu/bin/activate

# Set up CUDA library paths
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/cuda_runtime/lib"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/cublas/lib"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/cufft/lib"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/curand/lib"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/cusolver/lib"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/cusparse/lib"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$HOME/tf-gpu/lib/python3.10/site-packages/nvidia/cudnn/lib"

echo "GPU environment set up successfully!"
echo "LD_LIBRARY_PATH: $LD_LIBRARY_PATH"
