"""
Medical/Leave management endpoints: create leave with document and list leaves.
"""
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from database import LeaveRecord, Student
from dependencies import get_db
from utils.storage_utils import storage_manager


router = APIRouter(prefix="/medical", tags=["Medical/Leave"])


@router.post("/leave")
async def create_leave(
    student_id: int = Form(...),
    leave_type: str = Form(...),  # medical | authorized
    leave_date: Optional[str] = Form(None),  # YYYY-MM-DD
    note: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Validate
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if leave_type not in ("medical", "authorized"):
        raise HTTPException(status_code=400, detail="Invalid leave type")

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

    # Parse date
    leave_dt = datetime.strptime(leave_date, "%Y-%m-%d") if leave_date else datetime.utcnow()

    lr = LeaveRecord(
        student_id=student_id,
        leave_date=leave_dt,
        leave_type=leave_type,
        note=note,
        document_path=doc_url,
    )
    db.add(lr)
    db.commit()
    db.refresh(lr)
    return {
        "success": True,
        "id": lr.id,
        "student_id": lr.student_id,
        "leave_date": lr.leave_date.isoformat(),
        "leave_type": lr.leave_type,
        "note": lr.note,
        "document_path": lr.document_path,
    }


@router.get("/leave")
async def list_leaves(
    student_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(LeaveRecord)
    if student_id:
        q = q.filter(LeaveRecord.student_id == student_id)
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
            "leave_type": r.leave_type,
            "note": r.note,
            "document_path": r.document_path,
        }
        for r in rows
    ]





