#!/bin/bash
# Kill Project Script - Stops all backend, frontend and related processes
# Project: Facial_Attendance_System

set -e

echo "\n🔪 Stopping Facial Attendance System (backend + frontend)"

kill_pattern() {
  local pattern="$1"; local label="$2"
  local pids
  pids=$(pgrep -f "$pattern" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "🔍 $label: $pids"
    echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
    sleep 1
    # force kill leftovers
    pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "💀 Force killing $label: $pids"
      echo "$pids" | xargs -r kill -KILL 2>/dev/null || true
    fi
    echo "✅ $label stopped"
  else
    echo "ℹ️  No $label running"
  fi
}

# Backend processes (uvicorn / python)
kill_pattern "uvicorn main:app" "Uvicorn"
kill_pattern "python3 -m uvicorn main:app" "Uvicorn (module)"
kill_pattern "python.*backend/main.py" "Backend Python"

# Frontend processes (react/vite/npm/node)
kill_pattern "react-scripts start" "React dev server"
kill_pattern "vite" "Vite dev server"
kill_pattern "npm start" "npm start"
kill_pattern "node .*webpack" "Webpack"

# Free common ports
free_port() {
  local port=$1
  local pid
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "🔌 Freeing port $port (pid: $pid)"
    kill -TERM $pid 2>/dev/null || true
    sleep 1
    if lsof -ti:$port >/dev/null 2>&1; then
      kill -KILL $pid 2>/dev/null || true
    fi
    echo "✅ Port $port freed"
  else
    echo "ℹ️  Port $port already free"
  fi
}

free_port 8000  # backend
free_port 3000  # react
free_port 5173  # vite

# Clean temp logs
echo "🧹 Cleaning temp logs"
rm -f /tmp/backend*.log >/dev/null 2>&1 || true

echo "\n💀 All project processes terminated."
