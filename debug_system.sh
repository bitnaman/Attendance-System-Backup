#!/bin/bash
# Debug Script for Dental Attendance System
# Use this to quickly check for issues

echo "🔍 Dental Attendance System Debug Report"
echo "========================================"
echo ""

# Check services
echo "📊 Service Status:"
backend_status=$(curl -s http://localhost:8000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend: Running on http://localhost:8000"
    echo "   $(echo $backend_status | grep -o '"database":"[^"]*"')"
    echo "   $(echo $backend_status | grep -o '"face_recognition_status":"[^"]*"')"
else
    echo "❌ Backend: Not responding"
fi

if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend: Running on http://localhost:3000"
else
    echo "❌ Frontend: Not responding"
fi

echo ""

# Check API endpoints
echo "🔗 API Endpoints Test:"
endpoints=(
    "/health:Health Check"
    "/student/:Students List"
    "/student/classes:Classes List"
    "/attendance/sessions:Attendance Sessions"
)

for endpoint_info in "${endpoints[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    response=$(curl -s "http://localhost:8000$endpoint" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ $name ($endpoint): Working"
    else
        echo "❌ $name ($endpoint): Failed"
    fi
done

echo ""

# Check recent logs
echo "📋 Recent Backend Activity:"
if [ -f "backend/backend.log" ]; then
    echo "Last 5 lines from backend log:"
    tail -5 backend/backend.log | head -5
else
    echo "No backend log found"
fi

echo ""
echo "📋 Recent Frontend Activity:"
if [ -f "frontend/frontend.log" ]; then
    echo "Last 5 lines from frontend log:"
    tail -5 frontend/frontend.log | head -5
else
    echo "No frontend log found"
fi

echo ""

# Network connectivity test
echo "🌐 Network Connectivity:"
if curl -s http://localhost:8000/student/classes >/dev/null 2>&1; then
    echo "✅ Frontend can reach Backend API"
else
    echo "❌ Network connection issue between Frontend and Backend"
fi

echo ""
echo "💡 Quick Fixes:"
echo "- If Backend is down: ./kill_project.sh && ./start_project.sh"
echo "- If Frontend is down: cd frontend && npm start"
echo "- View logs: tail -f backend/backend.log"
echo "- View frontend logs: tail -f frontend/frontend.log"
echo ""
