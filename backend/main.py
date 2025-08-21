"""
PostgreSQL-Based Dental Attendance System - Main Backend
Fresh start with class-based attendance support and no data migration.
"""

import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import components
from database import Base, engine, SessionLocal, init_fresh_db, create_all_tables
from dependencies import get_db, get_face_recognizer, initialize_face_recognizer
from face_recognition import ClassBasedFaceRecognizer
from routers.students import router as students_router
from routers.attendance import router as attendance_router
from config import *

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT,
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        logger.info("Starting Dental Attendance System...")
        
        # Ensure directories exist
        ensure_directories()
        logger.info("Static directories created/verified")
        
        # Initialize fresh database (drops existing tables and creates new ones)
        # Comment out the next line after first run if you want to preserve data
        # init_fresh_db()  # COMMENTED OUT TO PRESERVE EXISTING DATA
        
        # Initialize database tables if they don't exist (preserves existing data)
        create_all_tables()
        logger.info("PostgreSQL database initialized")
        
        # Initialize face recognizer
        initialize_face_recognizer()
        logger.info("Face recognizer initialized")
        
        # Load students into recognizer (will be empty on fresh start)
        recognizer = get_face_recognizer()
        db = SessionLocal()
        try:
            recognizer.load_all_students(db)
            logger.info("Student data loaded into face recognizer")
        finally:
            db.close()
        
        logger.info("System initialized successfully!")
        logger.info("Ready for class-based attendance system!")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}", exc_info=True)
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Dental Attendance System")

# FastAPI app
app = FastAPI(
    title="Dental College Attendance System",
    description="A class-based face recognition attendance system with PostgreSQL backend.",
    version="6.0.1",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# API Routers
app.include_router(students_router)
app.include_router(attendance_router)

# Health check endpoint
@app.get("/health")
async def health_check(recognizer: ClassBasedFaceRecognizer = Depends(get_face_recognizer)):
    recognizer_status = "active" if recognizer else "inactive"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "6.0.0",
        "database": "PostgreSQL",
        "face_recognition_status": recognizer_status,
        "features": {
            "class_based_attendance": True,
            "fresh_database": True,
            "no_data_migration": True
        },
        "system_info": {
            "database": "PostgreSQL connected",
            "static_files": "mounted",
            "cors": "enabled",
            "class_support": "enabled"
        }
    }

@app.get("/")
async def root():
    return {
        "message": "Dental Attendance System API",
        "version": "6.0.0",
        "database": "PostgreSQL",
        "features": [
            "Class-based student management",
            "Class-specific attendance marking", 
            "Advanced face recognition with class filtering",
            "Comprehensive analytics and reporting"
        ],
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/system-info")
async def system_info(db: Session = Depends(get_db)):
    """Get system information and database status"""
    try:
        from database import Class, Student, AttendanceSession
        
        # Count database entities
        total_classes = db.query(Class).filter(Class.is_active == True).count()
        total_students = db.query(Student).filter(Student.is_active == True).count()
        total_sessions = db.query(AttendanceSession).count()
        
        return {
            "system_status": "operational",
            "database_type": "PostgreSQL",
            "version": "6.0.0",
            "fresh_installation": True,
            "data_migration": False,
            "statistics": {
                "active_classes": total_classes,
                "active_students": total_students,
                "attendance_sessions": total_sessions
            },
            "features": {
                "class_based_attendance": True,
                "face_recognition": True,
                "class_filtering": True,
                "analytics": True
            }
        }
    except Exception as e:
        logger.error(f"System info error: {e}")
        return {
            "system_status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host=HOST, 
        port=PORT, 
        reload=DEBUG,
        log_level=LOG_LEVEL.lower()
    )
