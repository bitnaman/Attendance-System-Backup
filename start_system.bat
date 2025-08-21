@echo off
REM Dental Attendance System - Complete Startup Script
REM This script starts both backend and frontend servers

echo ===================================
echo    DENTAL ATTENDANCE SYSTEM
echo ===================================
echo Starting complete system...
echo.

REM Store the main directory
set MAIN_DIR=%~dp0
cd /d "%MAIN_DIR%"

REM Start backend in a new window
echo Starting Backend Server...
start "Dental Attendance Backend" "%MAIN_DIR%start_backend.bat"

REM Wait a moment for backend to initialize
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend in a new window  
echo Starting Frontend Server...
start "Dental Attendance Frontend" "%MAIN_DIR%start_frontend.bat"

echo.
echo ===================================
echo    SYSTEM STARTUP COMPLETE
echo ===================================
echo Backend: http://127.0.0.1:8002
echo Frontend: http://localhost:3000
echo API Docs: http://127.0.0.1:8002/docs
echo.
echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
echo ===================================
pause
