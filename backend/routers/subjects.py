"""
Subject Management Router
Handles CRUD operations for subjects
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import Subject, Class, SessionLocal

router = APIRouter(prefix="/subjects", tags=["subjects"])


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic Models
class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None
    class_id: int


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(BaseModel):
    id: int
    name: str
    code: Optional[str]
    description: Optional[str]
    credits: Optional[int]
    class_id: int
    class_name: Optional[str] = None
    class_section: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Endpoints

@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(subject: SubjectCreate, db: Session = Depends(get_db)):
    """Create a new subject for a class"""
    
    # Verify class exists
    class_obj = db.query(Class).filter(Class.id == subject.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {subject.class_id} not found"
        )
    
    # Check if subject with same name already exists for this class
    existing = db.query(Subject).filter(
        and_(
            Subject.class_id == subject.class_id,
            Subject.name == subject.name
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject '{subject.name}' already exists for this class"
        )
    
    # Create subject
    db_subject = Subject(
        name=subject.name,
        code=subject.code,
        description=subject.description,
        credits=subject.credits,
        class_id=subject.class_id,
        is_active=True
    )
    
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    
    # Add class info to response
    response = SubjectResponse.from_orm(db_subject)
    response.class_name = class_obj.name
    response.class_section = class_obj.section
    
    return response


@router.get("/", response_model=List[SubjectResponse])
async def get_all_subjects(
    class_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all subjects, optionally filtered by class"""
    
    query = db.query(Subject)
    
    if class_id:
        query = query.filter(Subject.class_id == class_id)
    
    if active_only:
        query = query.filter(Subject.is_active == True)
    
    subjects = query.order_by(Subject.class_id, Subject.name).all()
    
    # Add class info to each subject
    response = []
    for subject in subjects:
        subject_data = SubjectResponse.from_orm(subject)
        if subject.class_obj:
            subject_data.class_name = subject.class_obj.name
            subject_data.class_section = subject.class_obj.section
        response.append(subject_data)
    
    return response


@router.get("/class/{class_id}", response_model=List[SubjectResponse])
async def get_subjects_by_class(class_id: int, db: Session = Depends(get_db)):
    """Get all active subjects for a specific class"""
    
    # Verify class exists
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {class_id} not found"
        )
    
    subjects = db.query(Subject).filter(
        and_(
            Subject.class_id == class_id,
            Subject.is_active == True
        )
    ).order_by(Subject.name).all()
    
    # Add class info to each subject
    response = []
    for subject in subjects:
        subject_data = SubjectResponse.from_orm(subject)
        subject_data.class_name = class_obj.name
        subject_data.class_section = class_obj.section
        response.append(subject_data)
    
    return response


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(subject_id: int, db: Session = Depends(get_db)):
    """Get a specific subject by ID"""
    
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )
    
    response = SubjectResponse.from_orm(subject)
    if subject.class_obj:
        response.class_name = subject.class_obj.name
        response.class_section = subject.class_obj.section
    
    return response


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    subject_update: SubjectUpdate,
    db: Session = Depends(get_db)
):
    """Update a subject"""
    
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )
    
    # Update fields
    update_data = subject_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(subject, field, value)
    
    subject.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subject)
    
    response = SubjectResponse.from_orm(subject)
    if subject.class_obj:
        response.class_name = subject.class_obj.name
        response.class_section = subject.class_obj.section
    
    return response


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    """Delete (soft delete) a subject"""
    
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )
    
    # Soft delete
    subject.is_active = False
    subject.updated_at = datetime.utcnow()
    
    db.commit()
    
    return None


@router.post("/{subject_id}/activate", response_model=SubjectResponse)
async def activate_subject(subject_id: int, db: Session = Depends(get_db)):
    """Activate a deactivated subject"""
    
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with id {subject_id} not found"
        )
    
    subject.is_active = True
    subject.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subject)
    
    response = SubjectResponse.from_orm(subject)
    if subject.class_obj:
        response.class_name = subject.class_obj.name
        response.class_section = subject.class_obj.section
    
    return response

