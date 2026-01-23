"""
Medical/Leave management endpoints: create leave with document and list leaves.
Approved leaves count towards attendance calculation.
"""
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import LeaveRecord, Student
from dependencies import get_db
from utils.storage_utils import storage_manager


router = APIRouter(prefix="/medical", tags=["Medical/Leave"])


@router.post("/leave")
async def create_leave(
    student_id: int = Form(...),
    leave_type: str = Form(...),  # medical | authorized
    leave_date: Optional[str] = Form(None),  # YYYY-MM-DD (start date)
    leave_end_date: Optional[str] = Form(None),  # YYYY-MM-DD (optional end date for multi-day leaves)
    sessions_count: int = Form(1),  # Number of lecture sessions this leave covers
    note: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Create a leave record for a student.
    
    The `sessions_count` field determines how many lecture sessions this leave covers.
    Approved leaves will be counted as "attended" for attendance percentage calculation.
    
    Attendance Formula: (Present Sessions + Approved Leave Sessions) / Total Sessions × 100
    """
    # Validate
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if leave_type not in ("medical", "authorized"):
        raise HTTPException(status_code=400, detail="Invalid leave type. Must be 'medical' or 'authorized'")
    if sessions_count < 1:
        raise HTTPException(status_code=400, detail="Sessions count must be at least 1")

    doc_url: Optional[str] = None
    if document is not None:
        if not (document.content_type or '').startswith('image/'):
            raise HTTPException(status_code=400, detail="Document must be an image (jpg/png/webp)")
        # Save under static/medical_documents/
        document.filename = document.filename or "document.jpg"
        from config import STATIC_DIR
        med_dir = STATIC_DIR / "medical_documents"
        med_dir.mkdir(parents=True, exist_ok=True)
        # Reuse local save helper
        doc_url = await storage_manager._save_to_local(document, med_dir / f"{student_id}_{int(datetime.now().timestamp())}_{document.filename}")

    # Parse dates
    leave_dt = datetime.strptime(leave_date, "%Y-%m-%d") if leave_date else datetime.utcnow()
    leave_end_dt = datetime.strptime(leave_end_date, "%Y-%m-%d") if leave_end_date else None

    lr = LeaveRecord(
        student_id=student_id,
        leave_date=leave_dt,
        leave_end_date=leave_end_dt,
        leave_type=leave_type,
        sessions_count=sessions_count,
        note=note,
        document_path=doc_url,
        is_approved=True,  # Auto-approved by default
    )
    db.add(lr)
    db.commit()
    db.refresh(lr)
    
    return {
        "success": True,
        "id": lr.id,
        "student_id": lr.student_id,
        "student_name": student.name,
        "leave_date": lr.leave_date.isoformat(),
        "leave_end_date": lr.leave_end_date.isoformat() if lr.leave_end_date else None,
        "leave_type": lr.leave_type,
        "sessions_count": lr.sessions_count,
        "is_approved": lr.is_approved,
        "note": lr.note,
        "document_path": lr.document_path,
        "message": f"Leave recorded for {student.name}. {sessions_count} session(s) will be counted as attended."
    }


@router.get("/leave")
async def list_leaves(
    student_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    approved_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """List leave records with optional filtering"""
    q = db.query(LeaveRecord)
    if student_id:
        q = q.filter(LeaveRecord.student_id == student_id)
    if approved_only:
        q = q.filter(LeaveRecord.is_approved == True)
    
    def _parse(d: str) -> datetime:
        return datetime.strptime(d, "%Y-%m-%d")
    if date_from:
        q = q.filter(LeaveRecord.leave_date >= _parse(date_from))
    if date_to:
        q = q.filter(LeaveRecord.leave_date <= _parse(date_to))
    q = q.order_by(LeaveRecord.leave_date.desc())
    rows = q.all()
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.name if r.student else None,
            "leave_date": r.leave_date.isoformat() if r.leave_date else None,
            "leave_end_date": r.leave_end_date.isoformat() if r.leave_end_date else None,
            "leave_type": r.leave_type,
            "sessions_count": getattr(r, 'sessions_count', 1) or 1,
            "is_approved": getattr(r, 'is_approved', True),
            "note": r.note,
            "document_path": r.document_path,
        }
        for r in rows
    ]


@router.put("/leave/{leave_id}/approve")
async def toggle_leave_approval(
    leave_id: int,
    approved: bool = Form(True),
    db: Session = Depends(get_db)
):
    """Toggle approval status of a leave record"""
    leave = db.query(LeaveRecord).filter(LeaveRecord.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    
    leave.is_approved = approved
    db.commit()
    
    return {
        "success": True,
        "id": leave.id,
        "is_approved": leave.is_approved,
        "message": f"Leave {'approved' if approved else 'unapproved'} successfully"
    }


@router.delete("/leave/{leave_id}")
async def delete_leave(
    leave_id: int,
    db: Session = Depends(get_db)
):
    """Delete a leave record"""
    leave = db.query(LeaveRecord).filter(LeaveRecord.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    
    db.delete(leave)
    db.commit()
    
    return {
        "success": True,
        "message": "Leave record deleted successfully"
    }


def get_approved_leave_sessions(db: Session, student_id: int, date_from: datetime = None, date_to: datetime = None) -> int:
    """
    Calculate total approved leave sessions for a student within a date range.
    This is used by attendance calculation logic.
    
    Returns: Total number of sessions covered by approved leaves
    """
    q = db.query(func.coalesce(func.sum(LeaveRecord.sessions_count), 0)).filter(
        LeaveRecord.student_id == student_id,
        LeaveRecord.is_approved == True
    )
    
    if date_from:
        q = q.filter(LeaveRecord.leave_date >= date_from)
    if date_to:
        q = q.filter(LeaveRecord.leave_date <= date_to)
    
    result = q.scalar()
    return int(result) if result else 0





