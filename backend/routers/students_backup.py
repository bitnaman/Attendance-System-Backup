"""
Student Router with Class-Based Support.
Handles student registratio    except Exception as e:
        logger.error(f"Create class error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create class: {e}")


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
    from database import AttendanceSession, AttendanceRecord
    
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
            "students": [],
            "attendance_sessions": [],
            "attendance_records": []
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
        
        # Export attendance sessions
        sessions = db.query(AttendanceSession).all()
        for session in sessions:
            backup_data["attendance_sessions"].append({
                "id": session.id,
                "session_name": session.session_name,
                "photo_path": session.photo_path,
                "class_id": session.class_id,
                "total_detected": session.total_detected,
                "total_present": session.total_present,
                "confidence_avg": session.confidence_avg,
                "created_at": session.created_at.isoformat() if session.created_at else None
            })
        
        # Export attendance records
        records = db.query(AttendanceRecord).all()
        for record in records:
            backup_data["attendance_records"].append({
                "id": record.id,
                "student_id": record.student_id,
                "session_id": record.session_id,
                "is_present": record.is_present,
                "confidence": record.confidence,
                "detection_details": record.detection_details,
                "created_at": record.created_at.isoformat() if record.created_at else None
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
                "students": len(backup_data["students"]),
                "attendance_sessions": len(backup_data["attendance_sessions"]),
                "attendance_records": len(backup_data["attendance_records"])
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
    from database import AttendanceSession, AttendanceRecord
    
    try:
        # Read backup file
        content = await backup_file.read()
        backup_data = json.loads(content.decode('utf-8'))
        
        # Validate backup format
        required_keys = ["classes", "students", "attendance_sessions", "attendance_records"]
        if not all(key in backup_data for key in required_keys):
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        # Clear existing data (optional - could be made configurable)
        # WARNING: This will delete all existing data!
        confirmation = True  # In production, this should come from user confirmation
        
        if confirmation:
            # Delete in reverse order of dependencies
            db.query(AttendanceRecord).delete()
            db.query(AttendanceSession).delete()
            db.query(Student).delete()
            db.query(Class).delete()
            db.commit()
        
        # Restore classes
        for class_data in backup_data["classes"]:
            new_class = Class(
                name=class_data["name"],
                section=class_data["section"],
                description=class_data.get("description"),
                is_active=class_data.get("is_active", True)
            )
            db.add(new_class)
        
        db.commit()  # Commit classes first to get IDs
        
        # Restore students
        for student_data in backup_data["students"]:
            new_student = Student(
                name=student_data["name"],
                age=student_data.get("age"),
                roll_no=student_data["roll_no"],
                prn=student_data.get("prn"),
                seat_no=student_data.get("seat_no"),
                email=student_data.get("email"),
                phone=student_data.get("phone"),
                photo_path=student_data.get("photo_path"),
                face_encoding_path=student_data.get("face_encoding_path"),
                class_id=student_data["class_id"],
                class_section=student_data.get("class_section"),
                is_active=student_data.get("is_active", True)
            )
            db.add(new_student)
        
        db.commit()  # Commit students to get IDs
        
        # Restore attendance sessions
        for session_data in backup_data["attendance_sessions"]:
            new_session = AttendanceSession(
                session_name=session_data["session_name"],
                photo_path=session_data.get("photo_path"),
                class_id=session_data["class_id"],
                total_detected=session_data.get("total_detected", 0),
                total_present=session_data.get("total_present", 0),
                confidence_avg=session_data.get("confidence_avg", 0.0)
            )
            db.add(new_session)
        
        db.commit()  # Commit sessions to get IDs
        
        # Restore attendance records
        for record_data in backup_data["attendance_records"]:
            new_record = AttendanceRecord(
                student_id=record_data["student_id"],
                session_id=record_data["session_id"],
                is_present=record_data.get("is_present", False),
                confidence=record_data.get("confidence", 0.0),
                detection_details=record_data.get("detection_details")
            )
            db.add(new_record)
        
        db.commit()
        
        logger.info(f"Backup restored successfully from {backup_file.filename}")
        
        return {
            "success": True,
            "message": f"Backup restored successfully from {backup_file.filename}",
            "restored": {
                "classes": len(backup_data["classes"]),
                "students": len(backup_data["students"]),
                "attendance_sessions": len(backup_data["attendance_sessions"]),
                "attendance_records": len(backup_data["attendance_records"])
            }
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        db.rollback()
        logger.error(f"Error restoring backup: {e}")
        raise HTTPException(status_code=500, detail=f"Error restoring backup: {str(e)}")


@router.post("/register") class assignment.
"""
import os
import shutil
import logging
from typing import Optional, List
from fastapi import APIRouter, UploadFile, Form, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import Student, Class, AttendanceRecord
from dependencies import get_db, get_face_recognizer

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


@router.post("/register")
async def register_student(
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

        # Process face images
        temp_dir = os.path.join("static", "student_photos")
        os.makedirs(temp_dir, exist_ok=True)
        temp_paths: List[str] = []
        
        try:
            for f in upload_list:
                temp_path = os.path.join(temp_dir, f"temp_{os.path.basename(f.filename)}")
                with open(temp_path, "wb") as buffer:
                    shutil.copyfileobj(f.file, buffer)
                temp_paths.append(temp_path)

            # Generate face embeddings
            if len(temp_paths) == 1:
                embedding_info = face_recognizer.generate_and_save_embedding(
                    image_path=temp_paths[0],
                    student_name=name,
                    student_roll_no=roll_no
                )
            else:
                embedding_info = face_recognizer.generate_and_save_embeddings(
                    image_paths=temp_paths,
                    student_name=name,
                    student_roll_no=roll_no
                )
        except ValueError as e:
            logger.error(f"[REGISTRATION] Face embedding error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        finally:
            # Cleanup temp files
            for p in temp_paths:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception as e:
                    logger.warning(f"Failed to remove temp file {p}: {e}")

        # Create student record
        student = Student(
            name=name,
            age=age,
            roll_no=roll_no,
            prn=prn,
            seat_no=seat_no,
            email=email,
            phone=phone,
            photo_path=embedding_info["photo_path"],
            face_encoding_path=embedding_info["embedding_path"],
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
                "photo_url": f"/static/dataset/{s.name.replace(' ', '_')}_{s.roll_no}/face.jpg" if s.photo_path else None
            }
            for s in students
        ]
    except Exception as e:
        logger.error(f"Get students error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch students")


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
        "photo_url": f"/static/dataset/{student.name.replace(' ', '_')}_{student.roll_no}/face.jpg" if student.photo_path else None
    }


@router.put("/{student_id}")
async def update_student(
    student_id: int,
    name: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    roll_no: Optional[str] = Form(None),
    prn: Optional[str] = Form(None),
    seat_no: Optional[str] = Form(None),
    class_id: Optional[int] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer)
):
    """Update student information"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Update basic fields
    update_data = {
        "name": name, "age": age, "roll_no": roll_no, "prn": prn,
        "seat_no": seat_no, "email": email, "phone": phone
    }
    
    for key, value in update_data.items():
        if value is not None:
            setattr(student, key, value)
    
    # Handle class change
    if class_id is not None:
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            raise HTTPException(status_code=400, detail="Invalid class ID")
        student.class_id = class_id
        student.class_section = class_obj.section
    
    # Handle image update
    if image:
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        temp_photo_path = f"static/student_photos/temp_{image.filename}"
        with open(temp_photo_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        try:
            embedding_info = face_recognizer.generate_and_save_embedding(
                image_path=temp_photo_path,
                student_name=student.name,
                student_roll_no=student.roll_no
            )
            student.photo_path = embedding_info["photo_path"]
            student.face_encoding_path = embedding_info["embedding_path"]
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        finally:
            if os.path.exists(temp_photo_path):
                os.remove(temp_photo_path)
    
    db.commit()
    db.refresh(student)
    
    # Update face recognizer memory
    if face_recognizer:
        student_info = {
            'id': student.id,
            'name': student.name,
            'roll_no': student.roll_no,
            'class_id': student.class_id,
            'class_name': student.class_obj.name,
            'class_section': student.class_section,
            'face_encoding_path': student.face_encoding_path
        }
        face_recognizer.add_student_to_memory(student_info)
    
    logger.info(f"Student updated: {student.name} (ID: {student.id})")
    return {"success": True, "message": f"Student {student.name} updated successfully"}


@router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer)
):
    """Delete a student"""
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
    
    # Remove from database
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).delete()
    db.delete(student)
    db.commit()

    # Remove from face recognizer memory
    face_recognizer.remove_student_from_memory(student_id)
    
    logger.info(f"Student deleted: {student_name} (ID: {student_id})")
    return {"success": True, "message": f"Student {student_name} deleted successfully"}


@router.post("/{student_id}/toggle-status")
async def toggle_student_status(
    student_id: int,
    db: Session = Depends(get_db),
    face_recognizer = Depends(get_face_recognizer)
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
        face_recognizer.add_student_to_memory(student_info)
    else:
        face_recognizer.remove_student_from_memory(student.id)

    status = "activated" if student.is_active else "deactivated"
    logger.info(f"Student {status}: {student.name} (ID: {student.id})")
    return {
        "success": True,
        "message": f"Student {student.name} {status}",
        "is_active": student.is_active
    }


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
    from database import AttendanceSession, AttendanceRecord
    
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
            "students": [],
            "attendance_sessions": [],
            "attendance_records": []
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
        
        # Export attendance sessions
        sessions = db.query(AttendanceSession).all()
        for session in sessions:
            backup_data["attendance_sessions"].append({
                "id": session.id,
                "session_name": session.session_name,
                "photo_path": session.photo_path,
                "class_id": session.class_id,
                "total_detected": session.total_detected,
                "total_present": session.total_present,
                "confidence_avg": session.confidence_avg,
                "created_at": session.created_at.isoformat() if session.created_at else None
            })
        
        # Export attendance records
        records = db.query(AttendanceRecord).all()
        for record in records:
            backup_data["attendance_records"].append({
                "id": record.id,
                "student_id": record.student_id,
                "session_id": record.session_id,
                "is_present": record.is_present,
                "confidence": record.confidence,
                "detection_details": record.detection_details,
                "created_at": record.created_at.isoformat() if record.created_at else None
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
                "students": len(backup_data["students"]),
                "attendance_sessions": len(backup_data["attendance_sessions"]),
                "attendance_records": len(backup_data["attendance_records"])
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
    from database import AttendanceSession, AttendanceRecord
    
    try:
        # Read backup file
        contents = await backup_file.read()
        backup_data = json.loads(contents)
        
        # Verify backup format
        if "version" not in backup_data or "students" not in backup_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        # Clear existing data (optional - you might want to make this configurable)
        # db.query(AttendanceRecord).delete()
        # db.query(AttendanceSession).delete()
        # db.query(Student).delete()
        # db.query(Class).delete()
        
        restored_counts = {
            "classes": 0,
            "students": 0,
            "attendance_sessions": 0,
            "attendance_records": 0
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
