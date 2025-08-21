@echo off
REM Dental Attendance System - Backend Startup Script
REM This script starts the FastAPI backend server with hot reload

echo ================================
echo    DENTAL ATTENDANCE BACKEND
echo ================================
echo Starting FastAPI server...
echo.

REM Navigate to backend directory
cd /d "G:\Naman Project\Dental Attendance\backend"

REM Check if virtual environment is already activated
if defined VIRTUAL_ENV (
    echo Virtual environment already activated: %VIRTUAL_ENV%
    set PYTHON_CMD=python
) else (
    REM Check if virtual environment exists
    if exist "..\.venv-py310\Scripts\python.exe" (
        echo Activating virtual environment...
        call "..\.venv-py310\Scripts\activate.bat"
        set PYTHON_CMD="..\.venv-py310\Scripts\python.exe"
    ) else (
        echo ERROR: Python virtual environment not found!
        echo Expected location: G:\Naman Project\Dental Attendance\.venv-py310\Scripts\python.exe
        echo Please ensure the virtual environment is properly set up.
        pause
        exit /b 1
    )
)

REM Start the FastAPI server with uvicorn
echo Backend server starting on http://127.0.0.1:8002
echo API Documentation will be available at http://127.0.0.1:8002/docs
echo.
echo Press Ctrl+C to stop the server
echo ================================

%PYTHON_CMD% -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload

REM If server stops, pause to show any error messages
echo.
echo ================================
echo Backend server stopped.
echo ================================
pause
