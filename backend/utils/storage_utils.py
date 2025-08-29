"""
Storage utilities for handling both local and S3 photo storage.
"""
import os
import logging
import shutil
from pathlib import Path
from typing import Optional, BinaryIO, Union
from urllib.parse import urljoin
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import UploadFile, HTTPException

from config import (
    PHOTO_STORAGE_TYPE,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    S3_BUCKET_NAME,
    STATIC_DIR,
    DATASET_DIR,
    STUDENT_PHOTOS_DIR,
    ATTENDANCE_PHOTOS_DIR,
    PHOTO_BASE_URL
)

logger = logging.getLogger(__name__)


class StorageManager:
    """Manages photo storage for both local filesystem and AWS S3."""
    
    def __init__(self):
        self.storage_type = PHOTO_STORAGE_TYPE
        self.s3_client: Optional[boto3.client] = None
        
        if self.storage_type == "s3":
            self._initialize_s3_client()
        else:
            self._ensure_local_directories()
    
    def _initialize_s3_client(self):
        """Initialize AWS S3 client with credentials."""
        try:
            if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
                raise ValueError("Missing required AWS credentials or bucket name")
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )
            
            # Test connection by checking if bucket exists
            self.s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
            logger.info(f"✅ Successfully connected to S3 bucket: {S3_BUCKET_NAME}")
            
        except NoCredentialsError:
            logger.error("❌ AWS credentials not found")
            raise HTTPException(status_code=500, detail="AWS credentials not configured")
        except ClientError as e:
            logger.error(f"❌ AWS S3 connection failed: {e}")
            raise HTTPException(status_code=500, detail=f"S3 connection failed: {e}")
        except Exception as e:
            logger.error(f"❌ S3 initialization failed: {e}")
            raise HTTPException(status_code=500, detail="S3 storage initialization failed")
    
    def _ensure_local_directories(self):
        """Ensure local storage directories exist."""
        directories = [STATIC_DIR, DATASET_DIR, STUDENT_PHOTOS_DIR, ATTENDANCE_PHOTOS_DIR]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
        logger.info("✅ Local storage directories ensured")
    
    async def save_student_photo(self, upload_file: UploadFile, student_name: str, roll_no: str) -> str:
        """
        Save student photo to configured storage.
        Returns the URL/path to access the photo.
        """
        try:
            # Generate file name
            filename_base = upload_file.filename or "photo.jpg"
            file_extension = os.path.splitext(filename_base)[1]
            filename = f"{student_name}_{roll_no}{file_extension}"
            
            if self.storage_type == "s3":
                return await self._save_to_s3(upload_file, f"student_photos/{filename}")
            else:
                return await self._save_to_local(upload_file, STUDENT_PHOTOS_DIR / filename)
                
        except Exception as e:
            logger.error(f"Failed to save student photo: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to save student photo")
    
    async def save_attendance_photo(self, upload_file: UploadFile, session_name: str) -> str:
        """
        Save attendance session photo to configured storage.
        Returns the URL/path to access the photo.
        """
        try:
            # Generate file name with timestamp
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename_base = upload_file.filename or "attendance.jpg"
            file_extension = os.path.splitext(filename_base)[1]
            filename = f"{session_name}_{timestamp}{file_extension}"
            
            if self.storage_type == "s3":
                return await self._save_to_s3(upload_file, f"attendance_photos/{filename}")
            else:
                return await self._save_to_local(upload_file, ATTENDANCE_PHOTOS_DIR / filename)
                
        except Exception as e:
            logger.error(f"Failed to save attendance photo: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to save attendance photo")
    
    async def save_dataset_photo(self, upload_file: UploadFile, student_name: str, roll_no: str, photo_index: int) -> str:
        """
        Save dataset photo for face recognition training.
        Returns the URL/path to access the photo.
        """
        try:
            # Create dataset folder structure
            dataset_folder = f"{student_name}_{roll_no}"
            filename_base = upload_file.filename or "dataset.jpg"
            file_extension = os.path.splitext(filename_base)[1]
            filename = f"{photo_index}{file_extension}"
            
            if self.storage_type == "s3":
                s3_path = f"dataset/{dataset_folder}/{filename}"
                return await self._save_to_s3(upload_file, s3_path)
            else:
                local_folder = DATASET_DIR / dataset_folder
                local_folder.mkdir(parents=True, exist_ok=True)
                return await self._save_to_local(upload_file, local_folder / filename)
                
        except Exception as e:
            logger.error(f"Failed to save dataset photo: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to save dataset photo")
    
    async def save_face_encoding(self, encoding_data: bytes, student_name: str, roll_no: str) -> str:
        """
        Save face encoding data to configured storage.
        Returns the URL/path to access the encoding file.
        """
        try:
            filename = f"{student_name}_{roll_no}_encoding.npy"
            
            if self.storage_type == "s3":
                return await self._save_bytes_to_s3(encoding_data, f"face_encodings/{filename}")
            else:
                encodings_dir = STATIC_DIR / "face_encodings"
                encodings_dir.mkdir(parents=True, exist_ok=True)
                local_path = encodings_dir / filename
                
                with open(local_path, 'wb') as f:
                    f.write(encoding_data)
                
                return self._get_local_url(local_path)
                
        except Exception as e:
            logger.error(f"Failed to save face encoding: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to save face encoding")
    
    async def _save_to_s3(self, upload_file: UploadFile, s3_key: str) -> str:
        """Save file to S3 and return public URL."""
        if not self.s3_client:
            raise HTTPException(status_code=500, detail="S3 client not initialized")
            
        try:
            # Reset file pointer to beginning
            await upload_file.seek(0)
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                upload_file.file,
                S3_BUCKET_NAME,
                s3_key,
                ExtraArgs={'ContentType': upload_file.content_type or 'image/jpeg'}
            )
            
            # Return public URL
            url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
            logger.info(f"✅ Uploaded to S3: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload to S3")
    
    async def _save_bytes_to_s3(self, data: bytes, s3_key: str) -> str:
        """Save bytes data to S3 and return public URL."""
        if not self.s3_client:
            raise HTTPException(status_code=500, detail="S3 client not initialized")
            
        try:
            self.s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Body=data,
                ContentType='application/octet-stream'
            )
            
            # Return public URL
            url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
            logger.info(f"✅ Uploaded bytes to S3: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 bytes upload failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload to S3")
    
    async def _save_to_local(self, upload_file: UploadFile, local_path: Path) -> str:
        """Save file to local filesystem and return URL."""
        try:
            # Ensure parent directory exists
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Reset file pointer to beginning
            await upload_file.seek(0)
            
            # Save file
            with open(local_path, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)
            
            logger.info(f"✅ Saved locally: {local_path}")
            return self._get_local_url(local_path)
            
        except Exception as e:
            logger.error(f"Local file save failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to save file locally")
    
    def _get_local_url(self, local_path: Path) -> str:
        """Generate URL for local file access."""
        # Get relative path from static directory
        try:
            relative_path = local_path.relative_to(STATIC_DIR)
            return urljoin(PHOTO_BASE_URL, f"/static/{relative_path}")
        except ValueError:
            # If path is not under STATIC_DIR, return absolute path
            return urljoin(PHOTO_BASE_URL, f"/files/{local_path.name}")
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete file from configured storage."""
        try:
            if self.storage_type == "s3":
                return await self._delete_from_s3(file_url)
            else:
                return await self._delete_from_local(file_url)
        except Exception as e:
            logger.error(f"Failed to delete file {file_url}: {e}")
            return False
    
    async def _delete_from_s3(self, file_url: str) -> bool:
        """Delete file from S3."""
        if not self.s3_client:
            logger.error("S3 client not initialized")
            return False
            
        try:
            # Extract S3 key from URL
            s3_key = file_url.split(f"{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/")[1]
            
            self.s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            logger.info(f"✅ Deleted from S3: {s3_key}")
            return True
            
        except Exception as e:
            logger.error(f"S3 delete failed: {e}")
            return False
    
    async def _delete_from_local(self, file_url: str) -> bool:
        """Delete file from local filesystem."""
        try:
            # Convert URL back to local path
            if "/static/" in file_url:
                relative_path = file_url.split("/static/")[1]
                local_path = STATIC_DIR / relative_path
                
                if local_path.exists():
                    local_path.unlink()
                    logger.info(f"✅ Deleted locally: {local_path}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Local delete failed: {e}")
            return False
    
    def get_photo_url(self, stored_path: str) -> str:
        """
        Get the public URL for a stored photo.
        For S3, returns the stored URL directly.
        For local, ensures proper URL formatting.
        """
        if self.storage_type == "s3":
            return stored_path  # S3 URLs are stored as full URLs
        else:
            # Ensure local URLs are properly formatted
            if stored_path.startswith("http"):
                return stored_path
            else:
                # Handle legacy relative paths
                return urljoin(PHOTO_BASE_URL, f"/static/{stored_path}")


# Global storage manager instance
storage_manager = StorageManager()
