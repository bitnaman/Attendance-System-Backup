"""
Attendance Router with Class-Based Filtering and Enhanced Storage.
Handles class-specific attendance marking and analytics.
"""
import os
import shutil
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, Form, File, HTTPException, Depends, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy import and_, func

from database import Student, Class, AttendanceSession, AttendanceRecord
from dependencies import get_db, get_face_recognizer
from utils.export_utils import attendance_exporter
from utils.storage_utils import storage_manager
import io
import csv

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


def safe_json_serialize(obj):
    """Convert NumPy types to Python native types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: safe_json_serialize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [safe_json_serialize(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif hasattr(obj, 'item'):  # Handle any remaining NumPy scalars
        return obj.item()
    else:
        return obj


_preview_store: Dict[str, Dict[str, Any]] = {}


@router.post("/process-batch")
async def process_batch_attendance(
    class_id: int = Form(...),
    subject_id: Optional[int] = Form(None),
    session_name: str = Form("Batch Session"),
    session_type: str = Form("normal"),  # normal|extra
    photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer)
):
    """Upload 3–5 photos, aggregate detections, return preview payload with candidate ID."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    if not photos or len(photos) == 0:
        raise HTTPException(status_code=400, detail="At least one image is required")

    # Load students for the class
    face_recognizer.load_class_students(db, class_id)

    # Save uploaded images and process
    saved_urls: List[str] = []
    identified: Dict[int, Dict[str, Any]] = {}
    try:
        for i, up in enumerate(photos):
            if not (up.content_type or '').startswith('image/'):
                raise HTTPException(status_code=400, detail="All files must be images")
            url = await storage_manager.save_attendance_photo(up, f"{session_name}_{i+1}")
            saved_urls.append(url)

            # Map URL to local path for processing when local
            from config import STATIC_DIR
            if "/static/" in url:
                local_path = str(STATIC_DIR / url.split("/static/")[1])
            else:
                # For S3/GCS: skip preview processing in this minimal version
                local_path = None

            if local_path and os.path.exists(local_path):
                # Try enhanced recognition first, fallback to standard
                try:
                    result = face_recognizer.process_class_photo_enhanced(local_path, class_id)
                    logger.info(f"✅ Enhanced recognition for photo {i+1}: {result.get('method', 'unknown')}")
                except Exception as e:
                    logger.warning(f"Enhanced recognition failed for photo {i+1}: {e}, falling back to standard")
                    result = face_recognizer.process_class_photo(local_path, class_id)
                
                for match in result.get("identified_students", []):
                    sid = int(match["student_id"])  # de-duplicate by highest confidence
                    if sid not in identified or match["confidence"] > identified[sid]["confidence"]:
                        identified[sid] = {
                            "student_id": sid,
                            "name": match.get("name"),
                            "confidence": float(match.get("confidence", 0.0)),
                        }

        # Build class roster to compute undetected
        class_students = db.query(Student).filter(Student.class_id == class_id, Student.is_active == True).all()
        detected_ids = set(identified.keys())
        undetected = [
            {"student_id": s.id, "name": s.name}
            for s in class_students if s.id not in detected_ids
        ]

        # Store preview candidate
        import uuid
        candidate_id = str(uuid.uuid4())
        _preview_store[candidate_id] = {
            "session_name": session_name,
            "session_type": session_type,
            "class_id": class_id,
            "subject_id": subject_id,
            "photo_urls": saved_urls,
            "detected": list(identified.values()),
            "undetected": undetected,
            "created_at": datetime.utcnow().isoformat(),
        }

        return {
            "sessionCandidateId": candidate_id,
            "detectedStudents": list(identified.values()),
            "undetected": undetected,
            "photoUrls": saved_urls,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process batch")


class CommitPayload(BaseModel):
    sessionCandidateId: str
    presentStudentIds: List[int]
    statusOverrides: Optional[Dict[int, str]] = None  # {studentId: status}


@router.post("/commit")
async def commit_batch_attendance(payload: CommitPayload, db: Session = Depends(get_db)):
    """Commit a preview by candidate ID with present list and optional overrides."""
    data = _preview_store.get(payload.sessionCandidateId)
    if not data:
        raise HTTPException(status_code=404, detail="Preview candidate not found or expired")

    class_id = data["class_id"]
    subject_id = data.get("subject_id")
    session_name = data["session_name"]
    session_type = data.get("session_type", "normal")

    # Create session
    session = AttendanceSession(
        session_name=session_name,
        photo_path=(data["photo_urls"][0] if data["photo_urls"] else None),
        class_id=class_id,
        subject_id=subject_id,
        total_detected=len(data["detected"]),
        total_present=len(payload.presentStudentIds),
        confidence_avg=0.0,
        session_type=session_type,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Build present set and overrides
    present_set = set(map(int, payload.presentStudentIds))
    overrides = {int(k): v for k, v in (payload.statusOverrides or {}).items()}

    # Class roster
    class_students = db.query(Student).filter(Student.class_id == class_id, Student.is_active == True).all()
    for s in class_students:
        is_present = s.id in present_set
        status = overrides.get(s.id)
        rec = AttendanceRecord(
            student_id=s.id,
            session_id=session.id,
            is_present=is_present,
            confidence=0.0,
            status=status or ("present" if is_present else "absent"),
        )
        db.add(rec)
    db.commit()

    # Cleanup preview
    _preview_store.pop(payload.sessionCandidateId, None)

    return {"success": True, "session_id": session.id}
@router.post("/mark")
async def mark_attendance(
    session_name: str = Form(...),
    class_id: int = Form(...),  # REQUIRED: Class selection for attendance
    subject_id: Optional[int] = Form(None),  # Optional: Subject selection for attendance
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer)
):
    """Mark attendance for a specific class and optionally a subject"""
    if not photo.content_type or not photo.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate class exists
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    # Load students for the specific class
    logger.info(f"Loading students for class {class_obj.name} {class_obj.section}")
    face_recognizer.load_class_students(db, class_id)
    
    # Save uploaded photo using storage manager
    try:
        photo_url = await storage_manager.save_attendance_photo(photo, session_name)
        logger.info(f"Attendance photo saved: {photo_url}")
    except Exception as e:
        logger.error(f"Failed to save attendance photo: {e}")
        raise HTTPException(status_code=500, detail="Failed to save photo")

    # For face recognition, we need a local file path
    # Handle different storage types
    photo_path_for_processing = None
    temp_file_path = None
    
    try:
        if storage_manager.storage_type == "s3":
            # Download from S3 for processing
            import tempfile
            import requests
            logger.info(f"Downloading S3 photo for processing: {photo_url}")
            response = requests.get(photo_url)
            response.raise_for_status()
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            temp_file.write(response.content)
            temp_file.close()
            photo_path_for_processing = temp_file.name
            temp_file_path = temp_file.name
            logger.info(f"Downloaded to temp file: {photo_path_for_processing}")
        else:
            # For local storage, convert URL back to file path
            from config import STATIC_DIR
            if "/static/" in photo_url:
                relative_path = photo_url.split("/static/")[1]
                photo_path_for_processing = str(STATIC_DIR / relative_path)
                logger.info(f"Using local file path: {photo_path_for_processing}")
            else:
                raise ValueError(f"Invalid local photo URL format: {photo_url}")

        # Verify file exists and is readable
        if not os.path.exists(photo_path_for_processing):
            raise FileNotFoundError(f"Photo file not found: {photo_path_for_processing}")

        # Process photo with enhanced recognition system
        logger.info(f"Processing photo for face recognition: {photo_path_for_processing}")
        
        # Try enhanced recognition first, fallback to standard
        try:
            processing_result = face_recognizer.process_class_photo_enhanced(photo_path_for_processing, class_id)
            logger.info(f"✅ Enhanced recognition completed: {processing_result.get('method', 'unknown')}")
        except Exception as e:
            logger.warning(f"Enhanced recognition failed: {e}, falling back to standard")
            processing_result = face_recognizer.process_class_photo(photo_path_for_processing, class_id)
        
        if "error" in processing_result:
             raise HTTPException(status_code=500, detail=processing_result["error"])

        # Create attendance session
        session = AttendanceSession(
            session_name=session_name,
            photo_path=photo_url,  # Store the URL/path for access
            class_id=class_id,
            subject_id=subject_id,
            total_detected=processing_result["total_faces_detected"],
            total_present=len(processing_result["identified_students"]),
            confidence_avg=float(sum(s["confidence"] for s in processing_result["identified_students"]) / 
                            max(1, len(processing_result["identified_students"])))
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        # Mark identified students as present
        identified_student_ids = {match["student_id"] for match in processing_result["identified_students"]}
        
        for student_match in processing_result["identified_students"]:
            try:
                facial_area = safe_json_serialize(student_match.get("facial_area", {}))
                detection_details_json = json.dumps(facial_area)
            except Exception as e:
                logger.warning(f"Failed to serialize facial_area: {e}")
                detection_details_json = json.dumps({})
                
            record = AttendanceRecord(
                student_id=student_match["student_id"],
                session_id=session.id,
                is_present=True,
                confidence=float(student_match["confidence"]),
                detection_details=detection_details_json
            )
            db.add(record)

        # Mark remaining class students as absent
        class_students = db.query(Student).filter(
            Student.class_id == class_id,
            Student.is_active == True
        ).all()
        
        for student in class_students:
            if student.id not in identified_student_ids:
                record = AttendanceRecord(
                    student_id=student.id,
                    session_id=session.id,
                    is_present=False,
                    confidence=0.0
                )
                db.add(record)

        db.commit()

        present_count = len(identified_student_ids)
        total_class_students = len(class_students)
        
        logger.info(f"Class attendance marked for {class_obj.name} {class_obj.section}: {present_count}/{total_class_students} present")

        return {
            "success": True,
            "session_id": session.id,
            "session_name": session_name,
            "class_id": class_id,
            "class_name": f"{class_obj.name} {class_obj.section}",
            "processing_result": safe_json_serialize(processing_result),
            "total_students": total_class_students,
            "present_count": present_count,
            "absent_count": total_class_students - present_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photo processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during photo processing.")
    finally:
        # Clean up temporary file if it was created
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up temporary file {temp_file_path}: {cleanup_error}")


@router.get("/sessions")
async def get_attendance_sessions(
    class_id: Optional[int] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get attendance sessions with optional class filtering"""
    query = db.query(AttendanceSession).join(Class)
    
    if class_id:
        query = query.filter(AttendanceSession.class_id == class_id)
        
    sessions = query.order_by(AttendanceSession.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        {
            "id": s.id,
            "session_name": s.session_name,
            "class_id": s.class_id,
            "class_name": s.class_obj.name,
            "class_section": s.class_obj.section,
            "total_detected": s.total_detected,
            "total_present": s.total_present,
            "confidence_avg": s.confidence_avg,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "date": s.created_at.isoformat() if s.created_at else None,  # compatibility
            "photo_url": f"/static/attendance_photos/{os.path.basename(s.photo_path)}" if s.photo_path else None
        }
        for s in sessions
    ]


@router.get("/records")
async def get_attendance_records(
    session_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    class_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get attendance records with filtering options"""
    query = db.query(AttendanceRecord).join(Student).join(AttendanceSession)
    
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    if student_id:
        query = query.filter(AttendanceRecord.student_id == student_id)
    if class_id:
        query = query.filter(Student.class_id == class_id)
        
    records = query.order_by(AttendanceRecord.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.name,
            "student_roll_no": r.student.roll_no,
            "class_id": r.student.class_id,
            "class_name": r.student.class_obj.name,
            "class_section": r.student.class_section,
            "session_id": r.session_id,
            "session_name": r.session.session_name,
            "is_present": r.is_present,
            # compatibility aliases
            "roll_no": r.student.roll_no,
            "prn": r.student.prn,
            "seat_no": r.student.seat_no,
            "status": r.is_present,
            "confidence": r.confidence,
            "detection_details": r.detection_details,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in records
    ]


@router.get("/stats")
async def get_attendance_stats(
    class_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get attendance statistics with optional class filtering"""
    
    # Base queries
    student_query = db.query(Student).filter(Student.is_active == True)
    session_query = db.query(AttendanceSession)
    record_query = db.query(AttendanceRecord).join(Student)
    
    # Apply class filtering if specified
    if class_id:
        student_query = student_query.filter(Student.class_id == class_id)
        session_query = session_query.filter(AttendanceSession.class_id == class_id)
        record_query = record_query.filter(Student.class_id == class_id)
    
    # Calculate statistics
    total_students = student_query.count()
    total_sessions = session_query.count()
    total_records = record_query.count()
    present_records = record_query.filter(AttendanceRecord.is_present == True).count()
    
    # Get recent session info
    recent_session = session_query.order_by(AttendanceSession.created_at.desc()).first()
    
    attendance_rate = (present_records / max(1, total_records)) * 100 if total_records > 0 else 0
    
    result = {
        "total_students": total_students,
        "total_sessions": total_sessions,
        "total_records": total_records,
        "present_records": present_records,
        "absent_records": total_records - present_records,
        "present": present_records,  # compatibility
        "absent": (total_records - present_records),  # compatibility
        "attendance_rate": round(attendance_rate, 1),
        "recent_session": {
            "id": recent_session.id,
            "name": recent_session.session_name,
            "class_name": f"{recent_session.class_obj.name} {recent_session.class_obj.section}",
            "date": recent_session.created_at.isoformat(),
            "present": recent_session.total_present,
            "detected": recent_session.total_detected
        } if recent_session else None
    }
    
    if class_id:
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if class_obj:
            result["class_info"] = {
                "id": class_obj.id,
                "name": class_obj.name,
                "section": class_obj.section
            }
    
    return result


@router.get("/analytics/class-performance")
async def get_class_performance(db: Session = Depends(get_db)):
    """Get attendance performance analytics by class"""
    try:
        classes = db.query(Class).filter(Class.is_active == True).all()
        performance_data = []
        
        for class_obj in classes:
            # Get students in this class
            student_count = db.query(Student).filter(
                Student.class_id == class_obj.id,
                Student.is_active == True
            ).count()
            
            # Get attendance sessions for this class
            session_count = db.query(AttendanceSession).filter(
                AttendanceSession.class_id == class_obj.id
            ).count()
            
            # Get attendance records for this class
            total_records = db.query(AttendanceRecord).join(Student).filter(
                Student.class_id == class_obj.id
            ).count()
            
            present_records = db.query(AttendanceRecord).join(Student).filter(
                Student.class_id == class_obj.id,
                AttendanceRecord.is_present == True
            ).count()
            
            attendance_rate = (present_records / max(1, total_records)) * 100 if total_records > 0 else 0
            
            performance_data.append({
                "class_id": class_obj.id,
                "class_name": class_obj.name,
                "class_section": class_obj.section,
                "student_count": student_count,
                "session_count": session_count,
                "total_records": total_records,
                "present_records": present_records,
                "attendance_rate": round(attendance_rate, 1)
            })
        
        return {
            "success": True,
            "class_performance": performance_data
        }
        
    except Exception as e:
        logger.error(f"Class performance analytics error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate class performance analytics")


@router.get("/export/excel")
async def export_attendance_excel(
    period: str = Query("all", description="Filter period: weekly, monthly, or all"),
    class_id: Optional[int] = Query(None, description="Optional class filter"),
    format_type: str = Query("summary", description="Export format: summary, detailed, or analytics"),
    db: Session = Depends(get_db)
):
    """Export beautiful, organized attendance data to Excel"""
    return await attendance_exporter.export_excel(period, class_id, format_type, db)


@router.get("/export/csv")
async def export_attendance_csv(
    period: str = Query("all", description="Filter period: weekly, monthly, or all"),
    class_id: Optional[int] = Query(None, description="Optional class filter"),
    db: Session = Depends(get_db)
):
    """Export attendance data to CSV format"""
    return await attendance_exporter.export_csv(period, class_id, db)


@router.get("/export/student")
async def export_student_attendance(
    student_id: int = Query(..., description="Student ID to export"),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    format: str = Query("csv", description="csv|pdf (csv default)"),
    db: Session = Depends(get_db)
):
    """Export individual student attendance within optional date range."""
    # Validate student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Build base query
    q = db.query(AttendanceRecord).join(AttendanceSession).filter(AttendanceRecord.student_id == student_id)

    # Date range filters
    def _parse(d: str) -> datetime:
        return datetime.strptime(d, "%Y-%m-%d")
    if date_from:
        q = q.filter(AttendanceSession.created_at >= _parse(date_from))
    if date_to:
        q = q.filter(AttendanceSession.created_at <= _parse(date_to) + timedelta(days=1))

    records: List[AttendanceRecord] = q.order_by(AttendanceSession.created_at.asc()).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Session", "Class", "Present", "Confidence"])
        for r in records:
            class_obj = r.session.class_obj
            writer.writerow([
                r.session.created_at.strftime('%Y-%m-%d') if r.session.created_at else "",
                r.session.session_name,
                f"{class_obj.name} {class_obj.section}" if class_obj else "",
                "Present" if r.is_present else "Absent",
                f"{r.confidence:.2f}" if r.confidence else ""
            ])
        filename = f"student_{student.name.replace(' ', '_')}_{student.roll_no}_attendance.csv"
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    elif format == "pdf":
        # Generate PDF report for individual student
        try:
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from reportlab.lib.units import inch
            import tempfile
            import os
            
            # Create temporary PDF file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.close()
            
            doc = SimpleDocTemplate(temp_file.name, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            story.append(Paragraph(f"Attendance Report - {student.name}", title_style))
            story.append(Spacer(1, 12))
            
            # Student info
            student_info = [
                ['Student Name:', student.name],
                ['Roll Number:', student.roll_no],
                ['PRN:', student.prn],
                ['Class:', f"{student.class_obj.name} {student.class_obj.section}" if student.class_obj else "N/A"],
                ['Report Period:', f"{date_from or 'All Time'} to {date_to or 'Present'}"],
                ['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
            ]
            
            student_table = Table(student_info, colWidths=[2*inch, 3*inch])
            student_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (1, 0), (1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(student_table)
            story.append(Spacer(1, 20))
            
            # Attendance summary
            total_sessions = len(records)
            present_sessions = sum(1 for r in records if r.is_present)
            attendance_rate = (present_sessions / max(1, total_sessions)) * 100
            
            summary_data = [
                ['Total Sessions', str(total_sessions)],
                ['Present', str(present_sessions)],
                ['Absent', str(total_sessions - present_sessions)],
                ['Attendance Rate', f"{attendance_rate:.1f}%"]
            ]
            
            summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(Paragraph("Attendance Summary", styles['Heading2']))
            story.append(summary_table)
            story.append(Spacer(1, 20))
            
            # Detailed records
            if records:
                story.append(Paragraph("Detailed Attendance Records", styles['Heading2']))
                
                # Table headers
                table_data = [['Date', 'Session', 'Class', 'Status', 'Confidence']]
                
                for r in records:
                    status = "Present" if r.is_present else "Absent"
                    confidence = f"{r.confidence:.2f}" if r.confidence else "N/A"
                    class_name = f"{r.session.class_obj.name} {r.session.class_obj.section}" if r.session.class_obj else "N/A"
                    date_str = r.session.created_at.strftime('%Y-%m-%d') if r.session.created_at else "N/A"
                    
                    table_data.append([
                        date_str,
                        r.session.session_name,
                        class_name,
                        status,
                        confidence
                    ])
                
                records_table = Table(table_data, colWidths=[1.2*inch, 2*inch, 1.5*inch, 1*inch, 1*inch])
                records_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
                ]))
                story.append(records_table)
            else:
                story.append(Paragraph("No attendance records found for the specified period.", styles['Normal']))
            
            # Build PDF
            doc.build(story)
            
            # Read the generated PDF
            with open(temp_file.name, 'rb') as f:
                pdf_content = f.read()
            
            # Clean up temp file
            os.unlink(temp_file.name)
            
            filename = f"student_{student.name.replace(' ', '_')}_{student.roll_no}_attendance.pdf"
            return StreamingResponse(
                io.BytesIO(pdf_content),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
        except ImportError:
            raise HTTPException(status_code=500, detail="PDF generation requires reportlab package. Please install: pip install reportlab")
        except Exception as e:
            logger.error(f"PDF generation error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to generate PDF report")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")


@router.get("/export/class-csv")
async def export_class_attendance_csv(
    class_id: int = Query(..., description="Class ID"),
    division: Optional[str] = Query(None, description="Optional class section filter"),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    db: Session = Depends(get_db)
):
    """Export class/division attendance over a date range as CSV (student summary)."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Students filter by class and optional division
    students_q = db.query(Student).filter(Student.class_id == class_id, Student.is_active == True)
    if division:
        students_q = students_q.filter(Student.class_section == division)
    students = students_q.all()

    # Date filters
    def _parse(d: str) -> datetime:
        return datetime.strptime(d, "%Y-%m-%d")
    start_dt = _parse(date_from) if date_from else datetime(2020, 1, 1)
    end_dt = (_parse(date_to) + timedelta(days=1)) if date_to else datetime.now() + timedelta(days=1)

    # Preload sessions within range and class
    sessions_q = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.created_at >= start_dt,
        AttendanceSession.created_at <= end_dt,
    )
    sessions = sessions_q.all()
    session_ids = [s.id for s in sessions]

    # Build CSV rows
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Roll No", "Division", "Total Sessions", "Present", "Absent", "Attendance %"])
    for s in students:
        rq = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == s.id,
            AttendanceRecord.session_id.in_(session_ids)
        )
        total = rq.count()
        present = rq.filter(AttendanceRecord.is_present == True).count()
        rate = round((present / max(1, total)) * 100, 1) if total else 0.0
        writer.writerow([s.name, s.roll_no, s.class_section, total, present, total - present, rate])

    filename = f"class_{class_obj.name.replace(' ', '_')}_{class_obj.section}_attendance.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/pdf-summary")
async def export_attendance_pdf_summary(
    period: str = Query("all", description="Filter period: weekly, monthly, or all"),
    class_id: Optional[int] = Query(None, description="Optional class filter"),
    db: Session = Depends(get_db)
):
    """Export attendance summary as PDF (placeholder for future implementation)"""
    # This would require additional dependencies like reportlab
    # For now, redirect to Excel export
    return await attendance_exporter.export_excel(period, class_id, "summary", db)


@router.get("/classes/available")
async def get_available_classes_for_export(db: Session = Depends(get_db)):
    """Get list of classes that have attendance data"""
    try:
        # Get classes that have attendance sessions
        classes_with_data = db.query(Class).join(AttendanceSession).filter(
            Class.is_active == True
        ).distinct().all()
        
        class_list = []
        for class_obj in classes_with_data:
            # Count sessions and students for this class
            session_count = db.query(AttendanceSession).filter(
                AttendanceSession.class_id == class_obj.id
            ).count()
            
            student_count = db.query(Student).filter(
                Student.class_id == class_obj.id,
                Student.is_active == True
            ).count()
            
            class_list.append({
                "id": class_obj.id,
                "name": class_obj.name,
                "section": class_obj.section,
                "display_name": f"{class_obj.name} - Section {class_obj.section}",
                "session_count": session_count,
                "student_count": student_count
            })
        
        return {
            "success": True,
            "classes": sorted(class_list, key=lambda x: x["display_name"])
        }
        
    except Exception as e:
        logger.error(f"Error fetching available classes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch available classes")


@router.get("/student-stats/{student_id}")
async def get_student_attendance_stats(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Get attendance statistics for a specific student"""
    try:
        # Validate student exists
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get attendance records for this student
        records_query = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id)
        total_records = records_query.count()
        present_records = records_query.filter(AttendanceRecord.is_present == True).count()
        absent_records = total_records - present_records
        
        # Get recent sessions
        recent_sessions = db.query(AttendanceSession).join(AttendanceRecord).filter(
            AttendanceRecord.student_id == student_id
        ).order_by(AttendanceSession.created_at.desc()).limit(5).all()
        
        # Calculate attendance rate
        attendance_rate = (present_records / max(1, total_records)) * 100 if total_records > 0 else 0
        
        # Get monthly breakdown (last 6 months)
        from datetime import datetime, timedelta
        six_months_ago = datetime.now() - timedelta(days=180)
        
        monthly_stats = []
        for i in range(6):
            month_start = six_months_ago + timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            
            month_records = records_query.join(AttendanceSession).filter(
                AttendanceSession.created_at >= month_start,
                AttendanceSession.created_at < month_end
            )
            
            month_total = month_records.count()
            month_present = month_records.filter(AttendanceRecord.is_present == True).count()
            month_rate = (month_present / max(1, month_total)) * 100 if month_total > 0 else 0
            
            monthly_stats.append({
                "month": month_start.strftime('%Y-%m'),
                "total": month_total,
                "present": month_present,
                "rate": round(month_rate, 1)
            })
        
        return {
            "success": True,
            "student_id": student_id,
            "student_name": student.name,
            "total_records": total_records,
            "present_records": present_records,
            "absent_records": absent_records,
            "attendance_rate": round(attendance_rate, 1),
            "recent_sessions": [
                {
                    "id": s.id,
                    "session_name": s.session_name,
                    "date": s.created_at.isoformat() if s.created_at else None,
                    "class_name": f"{s.class_obj.name} {s.class_obj.section}" if s.class_obj else None
                }
                for s in recent_sessions
            ],
            "monthly_breakdown": monthly_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Student stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get student statistics")


@router.get("/export/summary")
async def get_export_summary(
    period: str = Query("all", description="Filter period: weekly, monthly, or all"),
    class_id: Optional[int] = Query(None, description="Optional class filter"),
    db: Session = Depends(get_db)
):
    """Get enhanced summary of data available for export"""
    try:
        # Calculate date filters based on period
        end_date = datetime.now()
        if period == "weekly":
            start_date = end_date - timedelta(weeks=1)
            period_display = "Last 7 Days"
        elif period == "monthly":
            start_date = end_date - timedelta(days=30)
            period_display = "Last 30 Days"
        else:  # all
            start_date = datetime(2020, 1, 1)
            period_display = "All Time"
        
        # Count sessions and records
        session_query = db.query(AttendanceSession).filter(
            AttendanceSession.created_at >= start_date,
            AttendanceSession.created_at <= end_date
        )
        
        if class_id:
            session_query = session_query.filter(AttendanceSession.class_id == class_id)
        
        total_sessions = session_query.count()
        
        # Count total attendance records
        record_query = db.query(AttendanceRecord).join(AttendanceSession).filter(
            AttendanceSession.created_at >= start_date,
            AttendanceSession.created_at <= end_date
        )
        
        if class_id:
            record_query = record_query.filter(AttendanceSession.class_id == class_id)
        
        total_records = record_query.count()
        present_records = record_query.filter(AttendanceRecord.is_present == True).count()
        
        # Get class info if specific class selected
        class_info = None
        if class_id:
            class_obj = db.query(Class).filter(Class.id == class_id).first()
            if class_obj:
                class_info = {
                    "id": class_obj.id,
                    "name": class_obj.name,
                    "section": class_obj.section,
                    "display_name": f"{class_obj.name} - Section {class_obj.section}"
                }
        
        # Get student count in the filtered data
        student_query = db.query(Student).filter(Student.is_active == True)
        if class_id:
            student_query = student_query.filter(Student.class_id == class_id)
        total_students = student_query.count()
        
        # Calculate attendance insights
        avg_attendance_rate = round((present_records / max(1, total_records)) * 100, 1)
        
        # Determine data quality
        data_quality = "Excellent" if total_sessions >= 10 else "Good" if total_sessions >= 5 else "Limited"
        
        return {
            "success": True,
            "export_summary": {
                "period": period,
                "period_display": period_display,
                "start_date": start_date.strftime('%Y-%m-%d'),
                "end_date": end_date.strftime('%Y-%m-%d'),
                "class_info": class_info,
                "statistics": {
                    "total_sessions": total_sessions,
                    "total_students": total_students,
                    "total_records": total_records,
                    "present_records": present_records,
                    "absent_records": total_records - present_records,
                    "overall_attendance_rate": avg_attendance_rate
                },
                "insights": {
                    "data_quality": data_quality,
                    "avg_sessions_per_day": round(total_sessions / max(1, (end_date - start_date).days), 1) if period != "all" else "N/A",
                    "most_active_period": period_display
                },
                "export_options": [
                    {
                        "format": "excel_summary",
                        "name": "📊 Excel Summary",
                        "description": "Clean, organized summary with beautiful formatting",
                        "recommended": True
                    },
                    {
                        "format": "excel_detailed", 
                        "name": "📋 Excel Detailed",
                        "description": "Includes individual attendance records"
                    },
                    {
                        "format": "csv",
                        "name": "📄 CSV Format",
                        "description": "Simple spreadsheet format for data analysis"
                    }
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Export summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get export summary")
