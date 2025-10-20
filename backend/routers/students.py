"""
Student Router with Class-Based Support and Enhanced Storage.
Handles student registration, management, and attendance operations.
"""
import os
import shutil
import logging
from typing import Optional, List
from fastapi import APIRouter, UploadFile, Form, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import Student, Class, AttendanceRecord, AttendanceSession, LeaveRecord
from dependencies import get_db, get_face_recognizer
from config import STATIC_DIR
from utils.storage_utils import storage_manager
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/student",
    tags=["Students"],
)


@router.get("/classes")
async def get_classes(db: Session = Depends(get_db)):
    """Get all available classes"""
    try:
        classes = db.query(Class).filter(Class.is_active == True).order_by(Class.name, Class.section).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "section": c.section,
                "description": c.description,
                "student_count": len(c.students),
                "is_active": c.is_active,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in classes
        ]
    except Exception as e:
        logger.error(f"Get classes error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch classes")


@router.post("/classes")
async def create_class(
    name: str = Form(...),
    section: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create a new class"""
    try:
        # Check if class already exists
        existing = db.query(Class).filter(
            Class.name == name,
            Class.section == section
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Class with same name and section already exists")
        
        new_class = Class(name=name, section=section, description=description)
        db.add(new_class)
        db.commit()
        db.refresh(new_class)
        
        logger.info(f"Created new class: {name} {section}")
        return {
            "success": True,
            "message": f"Class {name} {section} created successfully",
            "class_id": new_class.id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create class error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create class")


@router.delete("/classes/{class_id}")
async def delete_class(class_id: int, db: Session = Depends(get_db)):
    """Delete a class (only if it has no students)"""
    try:
        # Check if class exists
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Check if class has any students
        student_count = db.query(Student).filter(Student.class_id == class_id).count()
        if student_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete class. It has {student_count} students. Please reassign or remove students first."
            )
        
        # Check if class has any attendance sessions
        from database import AttendanceSession
        session_count = db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).count()
        if session_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete class. It has {session_count} attendance sessions. Please remove attendance sessions first."
            )
        
        # Delete the class
        db.delete(class_obj)
        db.commit()
        
        logger.info(f"Deleted class: {class_obj.name} {class_obj.section} (ID: {class_id})")
        return {
            "success": True,
            "message": f"Class '{class_obj.name} - {class_obj.section}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete class error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete class")


@router.get("/backups")
async def get_backups():
    """Get list of available backup files"""
    import os
    from config import ROOT_DIR
    
    backup_dir = ROOT_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    
    try:
        backups = []
        if backup_dir.exists():
            for file in backup_dir.iterdir():
                if file.is_file() and (file.suffix == '.sql' or file.suffix == '.json'):
                    backups.append({
                        "filename": file.name,
                        "size": file.stat().st_size,
                        "created": file.stat().st_mtime,
                        "type": "database" if file.suffix == '.sql' else "json"
                    })
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x['created'], reverse=True)
        
        return {"success": True, "backups": backups}
    except Exception as e:
        logger.error(f"Error fetching backups: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching backups: {str(e)}")


@router.post("/backup")
async def create_backup(db: Session = Depends(get_db)):
    """Create a backup of all student and attendance data"""
    import json
    from datetime import datetime
    from config import ROOT_DIR
    
    backup_dir = ROOT_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    
    try:
        # Create timestamp for backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"attendance_backup_{timestamp}.json"
        backup_path = backup_dir / backup_filename
        
        # Collect all data
        backup_data = {
            "created_at": datetime.now().isoformat(),
            "version": "1.0",
            "classes": [],
            "students": []
        }
        
        # Export classes
        classes = db.query(Class).all()
        for class_obj in classes:
            backup_data["classes"].append({
                "id": class_obj.id,
                "name": class_obj.name,
                "section": class_obj.section,
                "description": class_obj.description,
                "is_active": class_obj.is_active,
                "created_at": class_obj.created_at.isoformat() if class_obj.created_at else None
            })
        
        # Export students
        students = db.query(Student).all()
        for student in students:
            backup_data["students"].append({
                "id": student.id,
                "name": student.name,
                "age": student.age,
                "roll_no": student.roll_no,
                "prn": student.prn,
                "seat_no": student.seat_no,
                "email": student.email,
                "phone": student.phone,
                "photo_path": student.photo_path,
                "face_encoding_path": student.face_encoding_path,
                "class_id": student.class_id,
                "class_section": student.class_section,
                "is_active": student.is_active,
                "created_at": student.created_at.isoformat() if student.created_at else None
            })
        
        # Write backup file
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Backup created successfully: {backup_filename}")
        
        return {
            "success": True,
            "message": f"Backup created successfully: {backup_filename}",
            "filename": backup_filename,
            "size": backup_path.stat().st_size,
            "records": {
                "classes": len(backup_data["classes"]),
                "students": len(backup_data["students"])
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")


@router.post("/restore")
async def restore_backup(
    backup_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Restore data from a backup file"""
    import json
    
    try:
        # Read backup file
        content = await backup_file.read()
        backup_data = json.loads(content.decode('utf-8'))
        
        # Validate backup format
        required_keys = ["classes", "students"]
        if not all(key in backup_data for key in required_keys):
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        restored_counts = {
            "classes": 0,
            "students": 0
        }
        
        # Restore classes (if they don't exist)
        for class_data in backup_data.get("classes", []):
            existing = db.query(Class).filter(
                Class.name == class_data["name"],
                Class.section == class_data["section"]
            ).first()
            
            if not existing:
                class_obj = Class(
                    name=class_data["name"],
                    section=class_data["section"],
                    description=class_data.get("description"),
                    is_active=class_data.get("is_active", True)
                )
                db.add(class_obj)
                restored_counts["classes"] += 1
        
        db.commit()
        
        # Note: Full restore would require more complex handling of foreign keys
        # and duplicate prevention. This is a basic implementation.
        
        logger.info(f"Backup restore completed: {restored_counts}")
        
        return {
            "success": True,
            "message": "Backup restored successfully",
            "restored": restored_counts
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format in backup file")
    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        raise HTTPException(status_code=500, detail=f"Error restoring backup: {str(e)}")


@router.get("/s/")
async def get_students(
    class_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get students with optional class filtering"""
    try:
        query = db.query(Student).join(Class)
        
        if class_id:
            query = query.filter(Student.class_id == class_id)
            
        students = query.order_by(Student.name).offset(offset).limit(limit).all()
        
        return [
            {
                "id": s.id,
                "name": s.name,
                "age": s.age,
                "roll_no": s.roll_no,
                "prn": s.prn,
                "seat_no": s.seat_no,
                "email": s.email,
                "phone": s.phone,
                "class_id": s.class_id,
                "class_name": s.class_obj.name,
                "class_section": s.class_section,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "photo_url": f"/static/dataset/{s.name.replace(' ', '_')}_{s.roll_no}/face.jpg" if s.photo_path else None,
                "embedding_confidence": s.embedding_confidence,
                "adaptive_threshold": s.adaptive_threshold,
                "has_enhanced_embeddings": bool(s.embedding_variants_path)
            }
            for s in students
        ]
    except Exception as e:
        logger.error(f"Get students error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch students")


@router.get("/")
async def get_students_simple(
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    db: Session = Depends(get_db)
):
    """Get all students with optional class filtering - simplified version"""
    try:
        query = db.query(Student).join(Class)
        
        if class_id:
            query = query.filter(Student.class_id == class_id)
        
        students = query.order_by(Student.roll_no).all()
        
        return [
            {
                "id": s.id,
                "name": s.name,
                "age": s.age,
                "roll_no": s.roll_no,
                "prn": s.prn,
                "seat_no": s.seat_no,
                "email": s.email,
                "phone": s.phone,
                "class_id": s.class_id,
                "class_name": s.class_obj.name,
                "class_section": s.class_section,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "photo_url": f"/static/dataset/{s.name.replace(' ', '_')}_{s.roll_no}/face.jpg" if s.photo_path else None,
                "embedding_confidence": s.embedding_confidence,
                "adaptive_threshold": s.adaptive_threshold,
                "has_enhanced_embeddings": bool(s.embedding_variants_path)
            }
            for s in students
        ]
    except Exception as e:
        logger.error(f"Get students error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch students")


@router.get("/filter")
async def get_students_filtered(
    class_id: Optional[int] = Query(None),
    division: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Filtered and paginated students list by class and division."""
    try:
        query = db.query(Student).join(Class).filter(Student.is_active == True)
        if class_id:
            query = query.filter(Student.class_id == class_id)
        if division:
            query = query.filter(Student.class_section == division)

        total = query.count()
        students = query.order_by(Student.roll_no).offset((page - 1) * page_size).limit(page_size).all()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "students": [
                {
                    "id": s.id,
                    "name": s.name,
                    "roll_no": s.roll_no,
                    "class_name": s.class_obj.name,
                    "class_section": s.class_section,
                    "photo_url": f"/static/dataset/{s.name.replace(' ', '_')}_{s.roll_no}/face.jpg" if s.photo_path else None
                }
                for s in students
            ]
        }
    except Exception as e:
        logger.error(f"Filtered students error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch filtered students")


@router.get("/{student_id}/stats")
async def get_student_stats(
    student_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get individual student attendance statistics and recent timeline."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    def _parse(d: str):
        from datetime import datetime
        return datetime.strptime(d, "%Y-%m-%d")

    rec_q = db.query(AttendanceRecord).join(AttendanceSession).filter(AttendanceRecord.student_id == student_id)
    if date_from:
        rec_q = rec_q.filter(AttendanceSession.created_at >= _parse(date_from))
    if date_to:
        from datetime import timedelta
        rec_q = rec_q.filter(AttendanceSession.created_at <= _parse(date_to) + timedelta(days=1))

    total = rec_q.count()
    present = rec_q.filter(AttendanceRecord.is_present == True).count()
    absent = total - present

    # Medical/authorized leaves
    leave_q = db.query(LeaveRecord).filter(LeaveRecord.student_id == student_id)
    if date_from:
        leave_q = leave_q.filter(LeaveRecord.leave_date >= _parse(date_from))
    if date_to:
        leave_q = leave_q.filter(LeaveRecord.leave_date <= _parse(date_to))
    medical = leave_q.filter(LeaveRecord.leave_type == "medical").count()
    authorized = leave_q.filter(LeaveRecord.leave_type == "authorized").count()

    rate = round((present / max(1, total)) * 100, 1) if total else 0.0

    # Recent timeline (last 20)
    recent = rec_q.order_by(AttendanceRecord.created_at.desc()).limit(20).all()
    timeline = [
        {
            "date": r.created_at.isoformat() if r.created_at else None,
            "session": r.session.session_name if r.session else None,
            "class": f"{r.session.class_obj.name} {r.session.class_obj.section}" if r.session and r.session.class_obj else None,
            "present": r.is_present,
            "confidence": r.confidence,
        }
        for r in recent
    ]

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "class_id": student.class_id,
            "class_name": student.class_obj.name if student.class_obj else None,
            "class_section": student.class_section,
        },
        "stats": {
            "total": total,
            "present": present,
            "absent": absent,
            "medical": medical,
            "authorized": authorized,
            "attendance_rate": rate,
        },
        "timeline": timeline,
    }


@router.get("/{student_id}")
async def get_student(student_id: int, db: Session = Depends(get_db)):
    """Get individual student details"""
    student = db.query(Student).join(Class).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "id": student.id,
        "name": student.name,
        "age": student.age,
        "roll_no": student.roll_no,
        "prn": student.prn,
        "seat_no": student.seat_no,
        "email": student.email,
        "phone": student.phone,
        "class_id": student.class_id,
        "class_name": student.class_obj.name,
        "class_section": student.class_section,
        "is_active": student.is_active,
        "created_at": student.created_at.isoformat() if student.created_at else None,
        "photo_url": f"/static/dataset/{student.name.replace(' ', '_')}_{student.roll_no}/face.jpg" if student.photo_path else None,
        "embedding_confidence": student.embedding_confidence,
        "adaptive_threshold": student.adaptive_threshold,
        "has_enhanced_embeddings": bool(student.embedding_variants_path)
    }


@router.post("/")
async def register_student(
    name: str = Form(...),
    age: str = Form(...),
    roll_no: str = Form(...),
    prn: str = Form(...),
    seat_no: str = Form(...),
    class_id: Optional[int] = Form(None),
    class_name: Optional[str] = Form(None),
    class_section: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    parents_mobile: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer),
    current_user = Depends(get_current_user)
):
    """Register a new student with class assignment"""
    try:
        logger.info(f"[REGISTRATION] Start registration for {name} (Roll: {roll_no})")
        
        # Handle class assignment
        target_class_id = None
        if class_id:
            # Direct class ID provided
            class_obj = db.query(Class).filter(Class.id == class_id).first()
            if not class_obj:
                raise HTTPException(status_code=400, detail="Invalid class ID")
            target_class_id = class_id
        elif class_name:
            # Find class by name and section
            query = db.query(Class).filter(Class.name == class_name)
            if class_section:
                query = query.filter(Class.section == class_section)
            class_obj = query.first()
            if not class_obj:
                raise HTTPException(status_code=400, detail="Class not found")
            target_class_id = class_obj.id
        else:
            raise HTTPException(status_code=400, detail="Either class_id or class_name must be provided")

        # Validate image uploads
        upload_list: List[UploadFile] = []
        if images:
            upload_list = [f for f in images if f is not None]
        if not upload_list and image is not None:
            upload_list = [image]

        if not upload_list:
            raise HTTPException(status_code=400, detail="At least one image file is required")

        for f in upload_list:
            if not (f.content_type or '').startswith('image/'):
                raise HTTPException(status_code=400, detail="All uploaded files must be images")

        # Check for existing student
        existing = db.query(Student).filter(
            (Student.roll_no == roll_no) | (Student.prn == prn) | (Student.seat_no == seat_no)
        ).first()

        if existing:
            logger.warning(f"[REGISTRATION] Duplicate student found: {existing.name}")
            raise HTTPException(status_code=400, detail="A student with the same Roll No, PRN, or Seat No already exists.")

        # Process face images using storage manager
        stored_photos = []
        
        try:
            # Save photos using storage manager
            for i, upload_file in enumerate(upload_list):
                photo_url = await storage_manager.save_dataset_photo(
                    upload_file, name, roll_no, i + 1
                )
                stored_photos.append(photo_url)
                logger.info(f"[REGISTRATION] Saved photo {i+1}: {photo_url}")

            # For face recognition, we need local file paths temporarily
            # Download photos if using S3, or use local paths directly
            temp_paths: List[str] = []
            if storage_manager.storage_type == "s3":
                # Download from S3 for face recognition processing
                import tempfile
                import requests
                temp_dir = tempfile.mkdtemp()
                for i, photo_url in enumerate(stored_photos):
                    response = requests.get(photo_url)
                    temp_path = os.path.join(temp_dir, f"temp_{i+1}.jpg")
                    with open(temp_path, 'wb') as f:
                        f.write(response.content)
                    temp_paths.append(temp_path)
            else:
                # For local storage, convert URLs back to file paths
                for photo_url in stored_photos:
                    if "/static/" in photo_url:
                        relative_path = photo_url.split("/static/")[1]
                        local_path = str(STATIC_DIR / relative_path)
                        temp_paths.append(local_path)

            # Generate face embeddings using enhanced system
            from ai.embedding_integration import generate_student_embeddings
            
            embedding_info = generate_student_embeddings(
                image_paths=temp_paths,
                student_name=name,
                student_roll_no=roll_no,
                use_enhanced=False  # Use standard system (more reliable)
            )
                
        except ValueError as e:
            logger.error(f"[REGISTRATION] Face embedding error: {e}")
            # Clean up uploaded photos on error
            for photo_url in stored_photos:
                await storage_manager.delete_file(photo_url)
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"[REGISTRATION] Photo processing error: {e}")
            # Clean up uploaded photos on error
            for photo_url in stored_photos:
                await storage_manager.delete_file(photo_url)
            raise HTTPException(status_code=500, detail="Failed to process photos")
        finally:
            # Cleanup temp files for S3 case
            if storage_manager.storage_type == "s3" and 'temp_dir' in locals():
                shutil.rmtree(temp_dir, ignore_errors=True)

        # Create student record with stored photo URLs and enhanced embedding data
        student = Student(
            name=name,
            age=int(age),
            roll_no=roll_no,
            prn=prn,
            seat_no=seat_no,
            email=email,
            phone=phone,
            gender=gender,
            blood_group=blood_group,
            parents_mobile=parents_mobile,
            photo_path=stored_photos[0] if stored_photos else None,  # Store primary photo URL
            face_encoding_path=embedding_info["embedding_path"],
            embedding_variants_path=embedding_info.get("variants_path"),
            embedding_metadata_path=embedding_info.get("metadata_path"),
            embedding_confidence=embedding_info.get("confidence_score", 0.8),
            adaptive_threshold=0.6,  # Default adaptive threshold
            class_id=target_class_id,
            class_section=class_obj.section
        )

        db.add(student)
        db.commit()
        db.refresh(student)

        # Add to face recognizer memory
        if face_recognizer:
            student_info = {
                'id': student.id,
                'name': student.name,
                'roll_no': student.roll_no,
                'class_id': student.class_id,
                'class_name': class_obj.name,
                'class_section': student.class_section,
                'face_encoding_path': student.face_encoding_path
            }
            face_recognizer.add_student_to_memory(student_info)

        logger.info(f"[REGISTRATION] Registration complete for {name} in class {class_obj.name} {class_obj.section}")

        return {
            "success": True,
            "message": f"Student {name} registered successfully in {class_obj.name} {class_obj.section}",
            "student_id": student.id,
            "class_id": target_class_id,
            "face_validation": {"valid": True, "reason": "Validation successful"}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[REGISTRATION] Registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during registration.")


@router.post("/register")
async def register_student_legacy(
    name: str = Form(...),
    age: int = Form(...),
    roll_no: str = Form(...),
    prn: str = Form(...),
    seat_no: str = Form(...),
    class_id: Optional[int] = Form(None),
    class_name: Optional[str] = Form(None),
    class_section: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer)
):
    """Legacy endpoint - redirects to main registration"""
    return await register_student(
        name=name, age=age, roll_no=roll_no, prn=prn, seat_no=seat_no,
        class_id=class_id, class_name=class_name, class_section=class_section,
        email=email, phone=phone, image=image, images=images,
        db=db, face_recognizer=face_recognizer
    )


@router.put("/{student_id}")
async def update_student(
    student_id: int,
    name: str = Form(None),
    age: str = Form(None),
    roll_no: str = Form(None),
    prn: str = Form(None),
    seat_no: str = Form(None),
    email: str = Form(None),
    phone: str = Form(None),
    class_id: int = Form(None),
    photo: UploadFile = File(None),
    photos: Optional[List[UploadFile]] = File(None),  # Support multiple photos for better embeddings
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer),
    current_user = Depends(get_current_user)
):
    """Update student information"""
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Update fields if provided
        if name is not None:
            student.name = name.strip()
        
        if age is not None:
            try:
                student.age = int(age)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid age value")
        
        if roll_no is not None:
            # Check for duplicate roll number
            existing = db.query(Student).filter(
                Student.roll_no == roll_no,
                Student.id != student_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Roll number already exists")
            student.roll_no = roll_no.strip()
        
        if prn is not None:
            # Check for duplicate PRN
            existing = db.query(Student).filter(
                Student.prn == prn,
                Student.id != student_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="PRN already exists")
            student.prn = prn.strip()
        
        if seat_no is not None:
            # Check for duplicate seat number
            existing = db.query(Student).filter(
                Student.seat_no == seat_no,
                Student.id != student_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Seat number already exists")
            student.seat_no = seat_no.strip()
        
        if email is not None:
            student.email = email.strip() if email.strip() else None
        
        if phone is not None:
            student.phone = phone.strip() if phone.strip() else None
        
        if class_id is not None:
            class_obj = db.query(Class).filter(Class.id == class_id, Class.is_active == True).first()
            if not class_obj:
                raise HTTPException(status_code=404, detail="Class not found")
            student.class_id = class_id
            student.class_section = class_obj.section
        
        # Update photo(s) if provided
        upload_list = []
        if photos:
            upload_list = [f for f in photos if f is not None and (getattr(f, 'content_type', '') == '' or getattr(f, 'content_type', '').startswith('image/'))]
        if not upload_list and photo and (getattr(photo, 'content_type', '') == '' or getattr(photo, 'content_type', '').startswith('image/')):
            upload_list = [photo]
        
        if upload_list:
            logger.info(f"🔄 Re-generating embeddings for student {student.name} with {len(upload_list)} photo(s) using current model")
            
            # IMPORTANT: Delete old embeddings BEFORE saving new photos to avoid removing newly saved files
            try:
                if student.face_encoding_path and os.path.exists(student.face_encoding_path):
                    old_dir = os.path.dirname(student.face_encoding_path)
                    logger.info(f"🗑️ Deleting old embeddings: {old_dir}")
                    if os.path.exists(old_dir):
                        shutil.rmtree(old_dir)
            except Exception as del_e:
                logger.warning(f"Failed to delete old embeddings: {del_e}")
            
            # Save photos using storage manager
            try:
                stored_photos = []
                for i, upload_file in enumerate(upload_list):
                    photo_url = await storage_manager.save_dataset_photo(upload_file, student.name, student.roll_no, i + 1)
                    stored_photos.append(photo_url)
                    logger.info(f"✅ Photo {i+1} saved: {photo_url}")
                
                # Get local paths for embedding generation
                temp_paths = []
                temp_files = []
                if storage_manager.storage_type == "s3":
                    # Download from S3 for processing
                    import tempfile
                    import requests
                    for photo_url in stored_photos:
                        response = requests.get(photo_url)
                        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                        temp_file.write(response.content)
                        temp_file.close()
                        temp_paths.append(temp_file.name)
                        temp_files.append(temp_file.name)
                else:
                    # For local storage, convert URLs to file paths
                    for photo_url in stored_photos:
                        if "/static/" in photo_url:
                            relative_path = photo_url.split("/static/")[1]
                            temp_paths.append(str(STATIC_DIR / relative_path))
                
                # Generate NEW embeddings with CURRENT model (Facenet512)
                from ai.embedding_integration import generate_student_embeddings
                
                embedding_info = generate_student_embeddings(
                    image_paths=temp_paths,
                    student_name=student.name,
                    student_roll_no=student.roll_no,
                    use_enhanced=False  # Use standard system (more reliable, no TensorFlow bugs)
                )
                
                # Update student with new embedding paths
                student.photo_path = stored_photos[0] if stored_photos else None
                student.face_encoding_path = embedding_info["embedding_path"]
                student.embedding_variants_path = embedding_info.get("variants_path")
                student.embedding_metadata_path = embedding_info.get("metadata_path")
                student.embedding_confidence = embedding_info.get("confidence_score", 0.8)
                
                logger.info(f"✅ New embeddings generated with current model: {embedding_info['embedding_path']}")
                
                # Cleanup temp files if S3
                for temp_file in temp_files:
                    try:
                        os.unlink(temp_file)
                    except:
                        pass
                
            except Exception as e:
                logger.error(f"❌ Face embedding regeneration failed: {e}", exc_info=True)
                raise HTTPException(status_code=400, detail=f"Failed to process photo: {str(e)}")
        
        db.commit()
        db.refresh(student)
        
        # Update face recognizer
        face_recognizer.load_all_students(db)
        
        return {
            "id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "class_name": student.class_obj.name,
            "class_section": student.class_section,
            "message": "Student updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Student update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update student")


@router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer),
    current_user = Depends(get_current_user)
):
    """Delete a student"""
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_name = student.name
        
        # Remove physical files
        if student.face_encoding_path:
            encoding_dir = os.path.dirname(student.face_encoding_path)
            if os.path.exists(encoding_dir):
                shutil.rmtree(encoding_dir)
                logger.info(f"Removed data directory: {encoding_dir}")
        
        # Remove related records first to avoid foreign key constraint violations
        # Delete attendance records
        db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).delete()
        
        # Delete leave records
        from database import LeaveRecord
        db.query(LeaveRecord).filter(LeaveRecord.student_id == student_id).delete()
        
        # Now delete the student
        db.delete(student)
        db.commit()

        # Remove from face recognizer memory
        if hasattr(face_recognizer, 'remove_student_from_memory'):
            face_recognizer.remove_student_from_memory(student_id)
        else:
            face_recognizer.load_all_students(db)
        
        logger.info(f"Student deleted: {student_name} (ID: {student_id})")
        return {"success": True, "message": f"Student {student_name} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Student deletion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete student")


@router.post("/{student_id}/upgrade-embeddings")
async def upgrade_student_embeddings(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upgrade student's embeddings to enhanced system"""
    try:
        from ai.embedding_integration import upgrade_student_to_enhanced
        
        success = upgrade_student_to_enhanced(student_id, db)
        
        if success:
            return {
                "success": True,
                "message": f"Student {student_id} embeddings upgraded to enhanced system"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to upgrade embeddings")
            
    except Exception as e:
        logger.error(f"Embedding upgrade error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upgrade embeddings")


@router.post("/{student_id}/toggle-status")
async def toggle_student_status(
    student_id: int,
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer),
    current_user = Depends(get_current_user)
):
    """Toggle student active status"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.is_active = not student.is_active
    db.commit()
    
    if student.is_active:
        student_info = {
            'id': student.id,
            'name': student.name,
            'roll_no': student.roll_no,
            'class_id': student.class_id,
            'class_name': student.class_obj.name,
            'class_section': student.class_section,
            'face_encoding_path': student.face_encoding_path
        }
        if hasattr(face_recognizer, 'add_student_to_memory'):
            face_recognizer.add_student_to_memory(student_info)
        else:
            face_recognizer.load_all_students(db)
    else:
        if hasattr(face_recognizer, 'remove_student_from_memory'):
            face_recognizer.remove_student_from_memory(student.id)
        else:
            face_recognizer.load_all_students(db)

    status = "activated" if student.is_active else "deactivated"
    logger.info(f"Student {status}: {student.name} (ID: {student.id})")
    return {
        "success": True,
        "message": f"Student {student.name} {status}",
        "is_active": student.is_active
    }
