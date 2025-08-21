#!/bin/bash
# Kill Project Script - Stops all backend, frontend and related processes
# For Dental Attendance System

echo "🔪 Killing all Dental Attendance System processes..."

# Function to kill processes by pattern
kill_processes_by_pattern() {
    local pattern="$1"
    local description="$2"
    
    echo "🔍 Looking for $description processes..."
    pids=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "🔪 Killing $description processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null
        sleep 2
        
        # Force kill if still running
        remaining_pids=$(pgrep -f "$pattern" 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
            echo "💀 Force killing remaining $description processes: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null
        fi
        echo "✅ $description processes stopped"
    else
        echo "ℹ️  No $description processes found"
    fi
}

# Kill backend processes
kill_processes_by_pattern "python3 main.py" "Backend Python"
kill_processes_by_pattern "uvicorn" "Uvicorn server"
kill_processes_by_pattern "fastapi" "FastAPI"

# Kill frontend processes  
kill_processes_by_pattern "npm start" "NPM start"
kill_processes_by_pattern "react-scripts start" "React scripts"
kill_processes_by_pattern "webpack" "Webpack dev server"

# Kill any processes on specific ports
echo "🔍 Checking for processes on ports 8000 and 3000..."

# Kill processes on port 8000 (backend)
port_8000_pid=$(lsof -ti:8000 2>/dev/null)
if [ -n "$port_8000_pid" ]; then
    echo "🔪 Killing process on port 8000: $port_8000_pid"
    kill -TERM $port_8000_pid 2>/dev/null
    sleep 2
    # Force kill if needed
    if lsof -ti:8000 >/dev/null 2>&1; then
        kill -KILL $port_8000_pid 2>/dev/null
    fi
    echo "✅ Port 8000 freed"
else
    echo "ℹ️  No process found on port 8000"
fi

# Kill processes on port 3000 (frontend)
port_3000_pid=$(lsof -ti:3000 2>/dev/null)
if [ -n "$port_3000_pid" ]; then
    echo "🔪 Killing process on port 3000: $port_3000_pid"
    kill -TERM $port_3000_pid 2>/dev/null
    sleep 2
    # Force kill if needed
    if lsof -ti:3000 >/dev/null 2>&1; then
        kill -KILL $port_3000_pid 2>/dev/null
    fi
    echo "✅ Port 3000 freed"
else
    echo "ℹ️  No process found on port 3000"
fi

# Clean up background processes and nohup files
echo "🧹 Cleaning up background processes and logs..."
cd /home/bitbuggy/Naman_Projects/Dental\ Attendance/backend
if [ -f nohup.out ]; then
    rm nohup.out
    echo "✅ Removed nohup.out"
fi

if [ -f backend.log ]; then
    rm backend.log
    echo "✅ Removed backend.log"
fi

# Kill any remaining Python processes in the project directory
project_python_pids=$(pgrep -f "/home/bitbuggy/Naman_Projects/Dental Attendance" 2>/dev/null)
if [ -n "$project_python_pids" ]; then
    echo "🔪 Killing remaining project-related processes: $project_python_pids"
    echo "$project_python_pids" | xargs kill -KILL 2>/dev/null
fi

echo ""
echo "🎯 Final verification..."
sleep 1

# Final check
backend_check=$(curl -s http://localhost:8000/health 2>/dev/null || echo "NOT_RUNNING")
frontend_check=$(curl -s http://localhost:3000 2>/dev/null || echo "NOT_RUNNING")

if [ "$backend_check" = "NOT_RUNNING" ]; then
    echo "✅ Backend confirmed stopped"
else
    echo "⚠️  Backend might still be running"
fi

if [ "$frontend_check" = "NOT_RUNNING" ]; then
    echo "✅ Frontend confirmed stopped"
else
    echo "⚠️  Frontend might still be running"
fi

echo ""
echo "💀 All Dental Attendance System processes killed!"
echo "🔄 You can now restart the project safely."
echo ""
echo "💡 To restart:"
echo "   ./start_project.sh"
echo ""
