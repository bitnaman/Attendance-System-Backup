"""
Background Task Manager with Progress Tracking
Supports Server-Sent Events (SSE) for real-time progress updates
"""
import asyncio
import logging
import uuid
from typing import Dict, Any, Callable, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
from collections import defaultdict

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TaskProgress:
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0  # 0-100
    message: str = ""
    result: Any = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class BackgroundTaskManager:
    """
    Manages background tasks with progress tracking.
    Supports SSE for real-time updates.
    """
    
    def __init__(self):
        self.tasks: Dict[str, TaskProgress] = {}
        self.subscribers: Dict[str, list] = defaultdict(list)
        self._cleanup_task = None
        
    def create_task(self, task_type: str = "generic") -> str:
        """Create a new task and return its ID"""
        task_id = f"{task_type}_{uuid.uuid4().hex[:8]}"
        self.tasks[task_id] = TaskProgress(task_id=task_id)
        logger.info(f"📝 Created background task: {task_id}")
        return task_id
    
    def get_task(self, task_id: str) -> Optional[TaskProgress]:
        """Get task progress by ID"""
        return self.tasks.get(task_id)
    
    def update_progress(self, task_id: str, progress: int, message: str = ""):
        """Update task progress and notify subscribers"""
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.progress = min(100, max(0, progress))
            task.message = message
            task.status = TaskStatus.RUNNING
            if task.started_at is None:
                task.started_at = datetime.now()
            
            # Notify SSE subscribers
            self._notify_subscribers(task_id, task.to_dict())
            logger.debug(f"📊 Task {task_id}: {progress}% - {message}")
    
    def complete_task(self, task_id: str, result: Any = None, message: str = "Completed"):
        """Mark task as completed"""
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.status = TaskStatus.COMPLETED
            task.progress = 100
            task.result = result
            task.message = message
            task.completed_at = datetime.now()
            
            self._notify_subscribers(task_id, task.to_dict())
            logger.info(f"✅ Task {task_id} completed")
    
    def fail_task(self, task_id: str, error: str):
        """Mark task as failed"""
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.status = TaskStatus.FAILED
            task.error = error
            task.message = f"Failed: {error}"
            task.completed_at = datetime.now()
            
            self._notify_subscribers(task_id, task.to_dict())
            logger.error(f"❌ Task {task_id} failed: {error}")
    
    def subscribe(self, task_id: str, callback: Callable):
        """Subscribe to task updates"""
        self.subscribers[task_id].append(callback)
    
    def unsubscribe(self, task_id: str, callback: Callable):
        """Unsubscribe from task updates"""
        if task_id in self.subscribers:
            self.subscribers[task_id] = [
                cb for cb in self.subscribers[task_id] if cb != callback
            ]
    
    def _notify_subscribers(self, task_id: str, data: Dict):
        """Notify all subscribers of a task update"""
        for callback in self.subscribers.get(task_id, []):
            try:
                callback(data)
            except Exception as e:
                logger.warning(f"Failed to notify subscriber: {e}")
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Remove old completed/failed tasks"""
        now = datetime.now()
        to_remove = []
        
        for task_id, task in self.tasks.items():
            if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                if task.completed_at:
                    age = (now - task.completed_at).total_seconds() / 3600
                    if age > max_age_hours:
                        to_remove.append(task_id)
        
        for task_id in to_remove:
            del self.tasks[task_id]
            if task_id in self.subscribers:
                del self.subscribers[task_id]
        
        if to_remove:
            logger.info(f"🧹 Cleaned up {len(to_remove)} old tasks")


# Global instance
task_manager = BackgroundTaskManager()


async def run_embedding_upgrade_async(
    task_id: str,
    student_id: int,
    db_session_factory: Callable,
    new_photo_paths: list = None,
    use_existing: bool = False
):
    """
    Run embedding upgrade in background with progress updates.
    This is the async version that reports progress.
    """
    try:
        task_manager.update_progress(task_id, 5, "Starting embedding upgrade...")
        
        # Import here to avoid circular imports
        from ai.embedding_integration import EmbeddingIntegration
        from database import Student
        
        # Create a new database session for this background task
        db = db_session_factory()
        
        try:
            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                task_manager.fail_task(task_id, "Student not found")
                return
            
            task_manager.update_progress(task_id, 10, f"Processing {student.name}...")
            
            # Initialize the embedding integration
            integration = EmbeddingIntegration()
            
            if not integration.enhanced_available:
                task_manager.fail_task(task_id, "Enhanced embedding system not available")
                return
            
            task_manager.update_progress(task_id, 15, "Loading face recognition models...")
            
            # Get image paths
            import os
            student_dir = f"static/dataset/{student.name.replace(' ', '_')}_{student.roll_no}"
            
            if new_photo_paths:
                image_paths = new_photo_paths
            else:
                # Find all images in student directory
                image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
                image_paths = []
                
                if os.path.exists(student_dir):
                    for file in os.listdir(student_dir):
                        if any(file.lower().endswith(ext) for ext in image_extensions):
                            # Skip backup directories
                            if 'backup' not in file:
                                image_paths.append(os.path.join(student_dir, file))
            
            if not image_paths:
                task_manager.fail_task(task_id, "No images found for student")
                return
            
            task_manager.update_progress(task_id, 20, f"Found {len(image_paths)} image(s)")
            
            # Generate enhanced embeddings with progress callbacks
            task_manager.update_progress(task_id, 25, "Generating embeddings with Model 1/3...")
            
            # The enhanced generator processes models sequentially
            # We'll update progress as we go
            result = await _generate_embeddings_with_progress(
                task_id, 
                integration.enhanced_generator,
                image_paths,
                student.name,
                student.roll_no
            )
            
            if result is None:
                task_manager.fail_task(task_id, "Failed to generate embeddings")
                return
            
            task_manager.update_progress(task_id, 90, "Saving embeddings to database...")
            
            # Update database
            import numpy as np
            import json
            
            os.makedirs(student_dir, exist_ok=True)
            
            # Save primary embedding
            primary_path = os.path.join(student_dir, "face_embedding.npy")
            np.save(primary_path, result['primary_embedding'])
            
            # Save variants
            variants_path = os.path.join(student_dir, "embedding_variants.npy")
            np.save(variants_path, result['embedding_variants'])
            
            # Save metadata with model info
            from config import FACE_RECOGNITION_MODEL, FACE_DETECTOR_BACKEND
            
            metadata = {
                'confidence_score': result['confidence_score'],
                'quality_scores': result['quality_scores'],
                'generated_at': datetime.now().isoformat(),
                'method': 'enhanced_ensemble',
                'primary_model': FACE_RECOGNITION_MODEL,
                'detector_backend': FACE_DETECTOR_BACKEND,
                'models_used': list(result['ensemble_embeddings'].keys())
            }
            
            metadata_path = os.path.join(student_dir, "embedding_metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Update student record
            student.embedding_variants_path = variants_path
            student.embedding_metadata_path = metadata_path
            student.embedding_confidence = result['confidence_score']
            student.has_enhanced_embeddings = True
            student.face_encoding_path = primary_path
            student.embedding_model = FACE_RECOGNITION_MODEL
            student.embedding_detector = FACE_DETECTOR_BACKEND
            
            db.commit()
            
            task_manager.update_progress(task_id, 95, "Finalizing...")
            
            task_manager.complete_task(
                task_id,
                result={
                    "student_id": student_id,
                    "student_name": student.name,
                    "confidence": result['confidence_score'],
                    "models_used": list(result['ensemble_embeddings'].keys())
                },
                message=f"Successfully upgraded embeddings for {student.name}"
            )
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Background embedding upgrade failed: {e}", exc_info=True)
        task_manager.fail_task(task_id, str(e))


async def _generate_embeddings_with_progress(
    task_id: str,
    generator,
    image_paths: list,
    student_name: str,
    student_roll_no: str
) -> dict:
    """Generate embeddings with progress updates"""
    try:
        total_models = len(generator.models)
        progress_per_model = 60 // total_models  # 60% of progress for models
        
        # Step 1: Generate ensemble embeddings (25-65%)
        task_manager.update_progress(task_id, 25, "Starting ensemble embedding generation...")
        
        # Run the blocking operation in a thread pool
        import asyncio
        loop = asyncio.get_event_loop()
        
        result = await loop.run_in_executor(
            None,
            lambda: generator.generate_enhanced_embedding(
                image_paths=image_paths,
                student_name=student_name,
                student_roll_no=student_roll_no
            )
        )
        
        task_manager.update_progress(task_id, 85, "Embedding generation complete")
        
        return result
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}", exc_info=True)
        return None
