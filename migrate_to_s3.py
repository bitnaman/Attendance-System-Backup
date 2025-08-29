#!/usr/bin/env python3
"""
Migration script to move photos from local storage to AWS S3.
Run this script when migrating from local to S3 storage.
"""
import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

from database import Student, AttendanceSession
from config import DATABASE_URL, STATIC_DIR

# Load environment variables
load_dotenv("backend/.env")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class S3Migrator:
    """Migrate photos from local storage to AWS S3."""
    
    def __init__(self):
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.s3_bucket_name = os.getenv("S3_BUCKET_NAME")
        
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.s3_bucket_name]):
            raise ValueError("Missing required AWS credentials or bucket name")
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.aws_region
        )
        
        # Initialize database
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = SessionLocal()
        
        logger.info("S3 Migrator initialized successfully")
    
    def verify_s3_connection(self):
        """Verify S3 bucket access."""
        try:
            self.s3_client.head_bucket(Bucket=self.s3_bucket_name)
            logger.info(f"✅ S3 bucket '{self.s3_bucket_name}' is accessible")
            return True
        except ClientError as e:
            logger.error(f"❌ Cannot access S3 bucket: {e}")
            return False
    
    def upload_file_to_s3(self, local_path: Path, s3_key: str) -> str:
        """Upload a file to S3 and return the public URL."""
        try:
            # Determine content type
            content_type = "image/jpeg"
            if local_path.suffix.lower() in ['.png']:
                content_type = "image/png"
            elif local_path.suffix.lower() in ['.webp']:
                content_type = "image/webp"
            
            # Upload file
            self.s3_client.upload_file(
                str(local_path),
                self.s3_bucket_name,
                s3_key,
                ExtraArgs={'ContentType': content_type}
            )
            
            # Return public URL
            url = f"https://{self.s3_bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
            logger.info(f"✅ Uploaded: {local_path.name} -> {s3_key}")
            return url
            
        except Exception as e:
            logger.error(f"❌ Failed to upload {local_path}: {e}")
            raise
    
    def migrate_student_photos(self, dry_run=True):
        """Migrate student photos to S3."""
        logger.info("Starting student photo migration...")
        
        students = self.db.query(Student).all()
        migrated_count = 0
        error_count = 0
        
        for student in students:
            try:
                if not student.photo_path:
                    continue
                
                # Handle both absolute and relative paths
                if student.photo_path.startswith('/'):
                    local_path = Path(student.photo_path)
                else:
                    local_path = STATIC_DIR / student.photo_path.lstrip('/')
                
                if not local_path.exists():
                    logger.warning(f"⚠️ File not found: {local_path}")
                    continue
                
                # Generate S3 key
                s3_key = f"student_photos/{student.name.replace(' ', '_')}_{student.roll_no}_{local_path.name}"
                
                if not dry_run:
                    # Upload to S3
                    s3_url = self.upload_file_to_s3(local_path, s3_key)
                    
                    # Update database
                    student.photo_path = s3_url
                    migrated_count += 1
                else:
                    logger.info(f"[DRY RUN] Would upload: {local_path} -> {s3_key}")
                    migrated_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error migrating photo for {student.name}: {e}")
                error_count += 1
        
        if not dry_run:
            self.db.commit()
        
        logger.info(f"Student photo migration completed: {migrated_count} migrated, {error_count} errors")
        return migrated_count, error_count
    
    def migrate_attendance_photos(self, dry_run=True):
        """Migrate attendance session photos to S3."""
        logger.info("Starting attendance photo migration...")
        
        sessions = self.db.query(AttendanceSession).all()
        migrated_count = 0
        error_count = 0
        
        for session in sessions:
            try:
                if not session.photo_path:
                    continue
                
                # Handle both absolute and relative paths
                if session.photo_path.startswith('/'):
                    local_path = Path(session.photo_path)
                else:
                    local_path = STATIC_DIR / session.photo_path.lstrip('/')
                
                if not local_path.exists():
                    logger.warning(f"⚠️ File not found: {local_path}")
                    continue
                
                # Generate S3 key
                s3_key = f"attendance_photos/{session.session_name.replace(' ', '_')}_{session.id}_{local_path.name}"
                
                if not dry_run:
                    # Upload to S3
                    s3_url = self.upload_file_to_s3(local_path, s3_key)
                    
                    # Update database
                    session.photo_path = s3_url
                    migrated_count += 1
                else:
                    logger.info(f"[DRY RUN] Would upload: {local_path} -> {s3_key}")
                    migrated_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error migrating photo for session {session.session_name}: {e}")
                error_count += 1
        
        if not dry_run:
            self.db.commit()
        
        logger.info(f"Attendance photo migration completed: {migrated_count} migrated, {error_count} errors")
        return migrated_count, error_count
    
    def migrate_dataset_photos(self, dry_run=True):
        """Migrate dataset photos to S3."""
        logger.info("Starting dataset photo migration...")
        
        dataset_dir = STATIC_DIR / "dataset"
        if not dataset_dir.exists():
            logger.warning("No dataset directory found")
            return 0, 0
        
        migrated_count = 0
        error_count = 0
        
        for student_dir in dataset_dir.iterdir():
            if not student_dir.is_dir():
                continue
            
            try:
                for photo_file in student_dir.iterdir():
                    if not photo_file.is_file():
                        continue
                    
                    # Generate S3 key
                    s3_key = f"dataset/{student_dir.name}/{photo_file.name}"
                    
                    if not dry_run:
                        # Upload to S3
                        s3_url = self.upload_file_to_s3(photo_file, s3_key)
                        migrated_count += 1
                    else:
                        logger.info(f"[DRY RUN] Would upload: {photo_file} -> {s3_key}")
                        migrated_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error migrating dataset for {student_dir.name}: {e}")
                error_count += 1
        
        logger.info(f"Dataset photo migration completed: {migrated_count} migrated, {error_count} errors")
        return migrated_count, error_count
    
    def run_migration(self, dry_run=True):
        """Run complete migration."""
        logger.info(f"Starting {'DRY RUN' if dry_run else 'ACTUAL'} migration to S3...")
        
        if not self.verify_s3_connection():
            return False
        
        try:
            # Migrate student photos
            student_migrated, student_errors = self.migrate_student_photos(dry_run)
            
            # Migrate attendance photos
            attendance_migrated, attendance_errors = self.migrate_attendance_photos(dry_run)
            
            # Migrate dataset photos
            dataset_migrated, dataset_errors = self.migrate_dataset_photos(dry_run)
            
            total_migrated = student_migrated + attendance_migrated + dataset_migrated
            total_errors = student_errors + attendance_errors + dataset_errors
            
            logger.info(f"Migration summary:")
            logger.info(f"✅ Total files migrated: {total_migrated}")
            logger.info(f"❌ Total errors: {total_errors}")
            
            if not dry_run and total_errors == 0:
                logger.info("🎉 Migration completed successfully!")
                logger.info("Remember to:")
                logger.info("1. Update PHOTO_STORAGE_TYPE=s3 in your .env file")
                logger.info("2. Restart your application")
                logger.info("3. Verify that photos are loading correctly")
            
            return total_errors == 0
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
        finally:
            self.db.close()


def main():
    """Main migration function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate photos from local storage to AWS S3")
    parser.add_argument("--dry-run", action="store_true", help="Perform a dry run without actual migration")
    parser.add_argument("--force", action="store_true", help="Perform actual migration")
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.force:
        logger.error("Please specify either --dry-run or --force")
        return 1
    
    try:
        migrator = S3Migrator()
        success = migrator.run_migration(dry_run=args.dry_run)
        return 0 if success else 1
    
    except Exception as e:
        logger.error(f"Migration script failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
