# Detailed Project Structure

## Backend
- **Directory:** `backend`
  - **Main Entry Point:** `main.py`
  - **Configuration:** `config.py`
  - **Database:**
    - `database.py`: Handles database connections and operations.
    - `migrations.py`: Manages database migrations.
    - `alembic.ini`: Alembic configuration file.
    - `alembic/`: Contains migration scripts.
  - **Dependencies:**
    - `dependencies.py`: Dependency injection and shared resources.
  - **Error Handling:**
    - `error_handling.py`: Centralized error handling.
  - **Face Recognition:**
    - `face_recognition.py`: Core logic for facial recognition.
  - **Utilities:**
    - `utils/`
      - `export_utils.py`: Utilities for exporting data.
      - `logging_utils.py`: Logging configuration and helpers.
      - `storage_utils.py`: File storage utilities.
  - **Routers:**
    - `routers/`
      - `attendance.py`: Attendance-related routes.
      - `students.py`: Student-related routes.
      - `students_backup.py`: Backup-related routes.
      - `students_corrupted.py`: Handles corrupted student data.
  - **Static Files:**
    - `static/`
      - `attendance_photos/`: Stores attendance photos.
      - `dataset/`: Stores datasets.
      - `embeddings/`: Stores embeddings.
      - `exports/`: Stores exported files.
      - `student_photos/`: Stores student photos.
      - `temp/`: Temporary files.
      - `uploads/`: Uploaded files.

## Frontend
- **Directory:** `frontend`
  - **Main Entry Point:** `src/index.js`
  - **Components:**
    - `src/components/`
      - `StudentRegistration.js`: Handles student registration.
      - `UploadPanel.js`: File upload panel.
      - `Test.js`: Test component.
    - `src/styles/`: Contains CSS files.
  - **Static Files:**
    - `public/index.html`: Main HTML file.
    - `build/`: Contains production build files.
  - **Configuration:**
    - `package.json`: Node.js dependencies and scripts.

## Logs
- **Directory:** `logs`
  - `app.log`: Application logs.

## Backups
- **Directory:** `backups`
  - Contains JSON backups of attendance data.

## Deployment
- **Scripts:**
  - `setup_gpu_env.sh`: Sets up GPU environment.
  - `setup_s3.sh`: Configures S3 storage.
  - `start_project.sh`: Starts the entire project.
  - `start_backend_smart.sh`: Starts the backend intelligently.
  - `start_system_enhanced.sh`: Enhanced system startup script.

## Documentation
- **Files:**
  - `README.md`: Project overview.
  - `DEPLOYMENT_GUIDE.md`: Deployment instructions.
  - `PROJECT_DETAILS.md`: Detailed project information.
  - `STORAGE_SWITCHING_GUIDE.md`: Guide for switching storage options.

## Tests
- **Files:**
  - `test_backup.py`: Tests for backup functionality.
  - `test_logging.sh`: Tests for logging configuration.
  - `test_registration.ps1`: Tests for registration functionality.

---

This structure provides a comprehensive overview of the project, including all components, directories, and files.
