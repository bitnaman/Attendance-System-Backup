#!/bin/bash

# Redis Setup Script for Facial Attendance System
echo "🚀 Setting up Redis for advanced features..."

# Check if Redis is already running
if pgrep redis-server > /dev/null; then
    echo "✅ Redis is already running"
    exit 0
fi

# Try to start Redis with systemd
if command -v systemctl > /dev/null; then
    echo "📦 Installing Redis via apt..."
    sudo apt update
    sudo apt install -y redis-server
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    echo "✅ Redis installed and started via systemd"
else
    echo "⚠️  Systemctl not available, trying alternative installation..."
    
    # Download and compile Redis (fallback method)
    echo "📥 Downloading Redis source..."
    wget http://download.redis.io/redis-stable.tar.gz
    tar xvzf redis-stable.tar.gz
    cd redis-stable
    
    echo "🔨 Compiling Redis..."
    make
    
    echo "🚀 Starting Redis server..."
    ./src/redis-server --daemonize yes --port 6379
    
    echo "✅ Redis compiled and started"
fi

# Test Redis connection
echo "🧪 Testing Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is working correctly!"
    echo "🔧 Redis configuration:"
    echo "   - Host: localhost"
    echo "   - Port: 6379"
    echo "   - Status: Running"
else
    echo "❌ Redis connection failed"
    echo "💡 You may need to start Redis manually:"
    echo "   redis-server --daemonize yes"
fi

echo "🎉 Redis setup complete!"
