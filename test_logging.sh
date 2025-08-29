#!/bin/bash
# Test script to demonstrate configurable logging intervals

echo "🔧 Testing Configurable Logging System"
echo "========================================"

# Function to test with different throttle values
test_logging() {
    local throttle_ms=$1
    local test_name=$2
    
    echo ""
    echo "📊 Testing with LOG_THROTTLE_MS=$throttle_ms ($test_name)"
    echo "Setting throttle to $throttle_ms ms in .env file..."
    
    # Update the .env file
    sed -i "s/LOG_THROTTLE_MS=.*/LOG_THROTTLE_MS=$throttle_ms/" .env
    
    echo "Making 5 rapid requests to see logging behavior..."
    for i in {1..5}; do
        curl -s "http://localhost:8000/health" > /dev/null
        sleep 0.1  # Small delay between requests
    done
    
    echo "✅ Test completed for $test_name"
}

# Test different throttle intervals
test_logging "100" "Very Frequent Logging (100ms)"
test_logging "1000" "Normal Logging (1 second)"
test_logging "5000" "Reduced Logging (5 seconds)"

# Reset to default
echo ""
echo "🔄 Resetting to default (2000ms)..."
sed -i "s/LOG_THROTTLE_MS=.*/LOG_THROTTLE_MS=2000/" .env

echo ""
echo "✅ Logging test completed!"
echo ""
echo "💡 Usage Instructions:"
echo "   - Edit .env file and change LOG_THROTTLE_MS value"
echo "   - Values are in milliseconds (1000ms = 1 second)"
echo "   - Lower values = more frequent logs"
echo "   - Higher values = less frequent logs"
echo ""
echo "Examples:"
echo "   LOG_THROTTLE_MS=500   # Log every 0.5 seconds"
echo "   LOG_THROTTLE_MS=2000  # Log every 2 seconds" 
echo "   LOG_THROTTLE_MS=10000 # Log every 10 seconds"
