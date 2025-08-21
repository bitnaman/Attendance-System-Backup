"""
Database models for the Dental Attendance System with Class-Based Attendance.

This module provides SQLAlchemy ORM models for PostgreSQL with class support.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

# Import configuration
from config import DATABASE_URL

# Engine and session factory for PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    echo=False           # Set to True for SQL debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Class(Base):
    """Class/Section model for organizing students"""
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)  # e.g., "BDS 1st Year"
    section = Column(String(10), nullable=False, index=True)  # e.g., "A", "B", "C"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    students = relationship("Student", back_populates="class_obj")
    attendance_sessions = relationship("AttendanceSession", back_populates="class_obj")

    def __repr__(self):
        return f"<Class(id={self.id}, name='{self.name}', section='{self.section}')>"


class Student(Base):
    """Student model with class assignment"""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    roll_no = Column(String(50), unique=True, nullable=False, index=True)
    prn = Column(String(50), unique=True, nullable=False, index=True)
    seat_no = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    photo_path = Column(String(500), nullable=True)
    face_encoding_path = Column(String(500), nullable=True)
    
    # Class assignment
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    class_section = Column(String(10), nullable=True)  # Denormalized for convenience
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    class_obj = relationship("Class", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student")

    def __repr__(self):
        return f"<Student(id={self.id}, name='{self.name}', roll_no='{self.roll_no}', class_id={self.class_id})>"


class AttendanceSession(Base):
    """Attendance session model with class filtering"""
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(200), nullable=False, index=True)
    photo_path = Column(String(500), nullable=True)
    
    # Class-specific session
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    
    total_detected = Column(Integer, default=0)
    total_present = Column(Integer, default=0)
    confidence_avg = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    class_obj = relationship("Class", back_populates="attendance_sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session")

    def __repr__(self):
        return f"<AttendanceSession(id={self.id}, name='{self.session_name}', class_id={self.class_id})>"


class AttendanceRecord(Base):
    """Individual attendance record"""
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False, index=True)
    is_present = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)
    detection_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="attendance_records")

    def __repr__(self):
        return f"<AttendanceRecord(id={self.id}, student_id={self.student_id}, session_id={self.session_id}, present={self.is_present})>"


def drop_all_tables() -> None:
    """Drop all existing tables - FRESH START"""
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped successfully")


def create_all_tables() -> None:
    """Create all tables with new schema"""
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully")


def init_fresh_db() -> None:
    """Initialize fresh database - drops existing and creates new"""
    print("🔄 Initializing fresh PostgreSQL database...")
    drop_all_tables()
    create_all_tables()
    
    # Create sample classes
    db = SessionLocal()
    try:
        create_sample_classes(db)
    finally:
        db.close()
    
    print("✅ Fresh database initialized successfully!")


def create_sample_classes(db_session) -> None:
    """Create sample classes for BTech IT and AIML programs"""
    sample_classes = [
        # BTech IT Classes
        {"name": "BTech FYIT", "section": "A", "description": "Bachelor of Technology - First Year Information Technology Section A"},
        {"name": "BTech FYIT", "section": "B", "description": "Bachelor of Technology - First Year Information Technology Section B"},
        {"name": "BTech SYIT", "section": "A", "description": "Bachelor of Technology - Second Year Information Technology Section A"},
        {"name": "BTech SYIT", "section": "B", "description": "Bachelor of Technology - Second Year Information Technology Section B"},
        {"name": "BTech TYIT", "section": "A", "description": "Bachelor of Technology - Third Year Information Technology Section A"},
        {"name": "BTech TYIT", "section": "B", "description": "Bachelor of Technology - Third Year Information Technology Section B"},
        
        # BTech AIML Classes
        {"name": "BTech FYAIML", "section": "A", "description": "Bachelor of Technology - First Year AI & Machine Learning Section A"},
        {"name": "BTech FYAIML", "section": "B", "description": "Bachelor of Technology - First Year AI & Machine Learning Section B"},
        {"name": "BTech SYAIML", "section": "A", "description": "Bachelor of Technology - Second Year AI & Machine Learning Section A"},
        {"name": "BTech SYAIML", "section": "B", "description": "Bachelor of Technology - Second Year AI & Machine Learning Section B"},
        {"name": "BTech TYAIML", "section": "A", "description": "Bachelor of Technology - Third Year AI & Machine Learning Section A"},
        {"name": "BTech TYAIML", "section": "B", "description": "Bachelor of Technology - Third Year AI & Machine Learning Section B"},
    ]
    
    for class_data in sample_classes:
        class_obj = Class(**class_data)
        db_session.add(class_obj)
    
    db_session.commit()
    print("✅ Sample BTech classes created successfully!")


if __name__ == "__main__":
    # Fresh database initialization
    init_fresh_db()
    
    # Create sample classes
    db = SessionLocal()
    try:
        create_sample_classes(db)
    finally:
        db.close()
