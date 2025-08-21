@echo off
REM Dental Attendance System - Frontend Startup Script
REM This script starts the React development server

echo ================================
echo    DENTAL ATTENDANCE FRONTEND
echo ================================
echo Starting React development server...
echo.

REM Navigate to frontend directory
cd /d "G:\Naman Project\Dental Attendance\frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo WARNING: node_modules not found. Installing dependencies...
    echo This may take a few minutes...
    echo.
    npm install
    echo.
    echo Dependencies installed successfully!
    echo ================================
)

REM Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please ensure you are in the correct frontend directory.
    pause
    exit /b 1
)

REM Start the React development server
echo Frontend server starting...
echo The application will open in your browser automatically
echo Default URL: http://localhost:3000 (or next available port)
echo.
echo Press Ctrl+C to stop the server
echo ================================

npm start

REM If server stops, pause to show any error messages
echo.
echo ================================
echo Frontend server stopped.
echo ================================
pause
