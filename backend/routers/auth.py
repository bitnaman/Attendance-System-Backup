"""
Authentication and user management endpoints.
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal, User


router = APIRouter(prefix="/auth", tags=["Authentication"])


# Security settings
SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change-this-in-.env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    is_primary_admin: bool = False
    profile_photo: Optional[str] = None
    # Soft delete fields
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deletion_reason: Optional[str] = None
    deleted_by_id: Optional[int] = None

    class Config:
        from_attributes = True


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(db, username)
    if not user or not user.is_active:
        return None
    # Prevent deleted users from logging in
    if user.is_deleted:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    return user


def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin privileges required")
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str  # "teacher" | "superadmin" | "student"


# Profile photo storage path
PROFILE_PHOTO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "profiles")
os.makedirs(PROFILE_PHOTO_DIR, exist_ok=True)


async def save_profile_photo(file: UploadFile, username: str) -> str:
    """Save profile photo and return the URL path."""
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    filename = f"{username}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PROFILE_PHOTO_DIR, filename)
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    return f"/static/profiles/{filename}"


@router.post("/users", response_model=UserOut)
def create_user(payload: CreateUserRequest, db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    if payload.role not in ("teacher", "superadmin", "student"):
        raise HTTPException(status_code=400, detail="Invalid role")
    existing = get_user_by_username(db, payload.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/with-photo", response_model=UserOut)
async def create_user_with_photo(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_superadmin)
):
    """Create a new user with optional profile photo."""
    if role not in ("teacher", "superadmin", "student"):
        raise HTTPException(status_code=400, detail="Invalid role")
    existing = get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    
    profile_photo_path = None
    if photo and photo.filename:
        profile_photo_path = await save_profile_photo(photo, username)
    
    user = User(
        username=username,
        password_hash=get_password_hash(password),
        role=role,
        profile_photo=profile_photo_path,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/photo", response_model=UserOut)
async def update_user_photo(
    user_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's profile photo. Users can update their own, superadmins can update anyone's."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    if current_user.role != "superadmin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user's photo")
    
    # Delete old photo if exists
    if user.profile_photo:
        old_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), user.profile_photo.lstrip("/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except:
                pass
    
    profile_photo_path = await save_profile_photo(photo, user.username)
    user.profile_photo = profile_photo_path
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserOut])
def get_users(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_superadmin)
):
    """Get all users (superadmin only) - hides primary admin from non-primary users"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    
    # Hide primary admin users from everyone except primary admins themselves
    if not current_user.is_primary_admin:
        users = [u for u in users if not u.is_primary_admin]
    
    return users


class BootstrapRequest(BaseModel):
    username: str
    password: str


@router.post("/bootstrap-superadmin", response_model=UserOut)
def bootstrap_superadmin(payload: BootstrapRequest, db: Session = Depends(get_db)):
    """Create initial superadmin if no users exist yet (one-time bootstrap).
    
    The first superadmin created is automatically set as the PRIMARY ADMIN:
    - Cannot be deleted by anyone
    - Cannot have their role changed by anyone
    - Only they can change their own password
    - Other superadmins cannot see or modify this account
    """
    user_count = db.query(User).count()
    if user_count > 0:
        raise HTTPException(status_code=403, detail="Bootstrap not allowed: users already exist")
    existing = get_user_by_username(db, payload.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role="superadmin",
        is_active=True,
        is_primary_admin=True,  # 🔒 First user is the PRIMARY ADMIN - protected and unmodifiable
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class UpdateUserDetailsRequest(BaseModel):
    username: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/users/{user_id}/details", response_model=UserOut)
def update_user_details(
    user_id: int,
    payload: UpdateUserDetailsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Update user details (superadmin only). Can update username and active status."""
    # Get the target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 🔒 PROTECT PRIMARY ADMIN: Cannot modify primary admin (except by themselves)
    if target_user.is_primary_admin and target_user.id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot modify primary admin '{target_user.username}'. This account is protected."
        )
    
    # Update username if provided
    if payload.username is not None:
        # Check username format
        if len(payload.username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if not payload.username.replace('_', '').replace('-', '').isalnum():
            raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, underscores and hyphens")
        
        # Check if username already exists (excluding current user)
        existing = db.query(User).filter(
            User.username == payload.username,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
        
        target_user.username = payload.username
    
    # Update active status if provided
    if payload.is_active is not None:
        # Cannot deactivate primary admin
        if target_user.is_primary_admin and not payload.is_active:
            raise HTTPException(status_code=403, detail="Cannot deactivate primary admin account")
        target_user.is_active = payload.is_active
    
    target_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(target_user)
    
    return target_user


class UpdateUserRoleRequest(BaseModel):
    role: str  # "teacher" | "superadmin" | "student"


@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Update a user's role (superadmin only)"""
    # Validate role
    if payload.role not in ("teacher", "superadmin", "student"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'teacher', 'superadmin', or 'student'")
    
    # Get the target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent users from changing their own role
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    # 🔒 PROTECT PRIMARY ADMIN: Cannot change role of primary admin
    if target_user.is_primary_admin:
        raise HTTPException(
            status_code=403, 
            detail=f"Cannot change role of primary admin '{target_user.username}'. This account is protected."
        )
    
    # Update the role
    target_user.role = payload.role
    target_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(target_user)
    
    return target_user


# ============================================
# SOFT DELETE MANAGEMENT
# ============================================

class DeleteUserRequest(BaseModel):
    reason: str  # Required reason for deletion


@router.delete("/users/{user_id}", response_model=UserOut)
def soft_delete_user(
    user_id: int,
    payload: DeleteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """
    Soft delete a user (superadmin only).
    - User is marked as deleted but remains in the system for 45 days
    - Deleted users cannot login
    - A reason must be provided
    """
    # Get the target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete yourself
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # 🔒 PROTECT PRIMARY ADMIN: Cannot delete primary admin
    if target_user.is_primary_admin:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot delete primary admin '{target_user.username}'. This account is protected."
        )
    
    # Check if already deleted
    if target_user.is_deleted:
        raise HTTPException(status_code=400, detail="User is already deleted")
    
    # Validate reason
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Deletion reason must be at least 5 characters")
    
    # Soft delete the user
    target_user.is_deleted = True
    target_user.deleted_at = datetime.utcnow()
    target_user.deletion_reason = payload.reason.strip()
    target_user.deleted_by_id = current_user.id
    target_user.is_active = False  # Also deactivate
    target_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(target_user)
    
    return target_user


@router.post("/users/{user_id}/restore", response_model=UserOut)
def restore_deleted_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Restore a soft-deleted user (superadmin only)."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not target_user.is_deleted:
        raise HTTPException(status_code=400, detail="User is not deleted")
    
    # Restore the user
    target_user.is_deleted = False
    target_user.deleted_at = None
    target_user.deletion_reason = None
    target_user.deleted_by_id = None
    target_user.is_active = True
    target_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(target_user)
    
    return target_user


@router.delete("/users/cleanup/expired")
def cleanup_expired_deleted_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """
    Permanently delete users that were soft-deleted more than 45 days ago.
    This is a manual cleanup endpoint for superadmins.
    """
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=45)
    
    expired_users = db.query(User).filter(
        User.is_deleted == True,
        User.deleted_at < cutoff_date
    ).all()
    
    deleted_count = len(expired_users)
    deleted_usernames = [u.username for u in expired_users]
    
    for user in expired_users:
        # Delete profile photo if exists
        if user.profile_photo:
            photo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), user.profile_photo.lstrip("/"))
            if os.path.exists(photo_path):
                try:
                    os.remove(photo_path)
                except:
                    pass
        db.delete(user)
    
    db.commit()
    
    return {
        "message": f"Permanently deleted {deleted_count} expired user(s)",
        "deleted_users": deleted_usernames,
        "cutoff_date": cutoff_date.isoformat()
    }


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.put("/users/{user_id}/password", response_model=UserOut)
def reset_user_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Reset a user's password (superadmin only, or user changing their own password)"""
    # Get the target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 🔒 PROTECT PRIMARY ADMIN: Only primary admin can change their own password
    if target_user.is_primary_admin and target_user.id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot change password of primary admin '{target_user.username}'. Only they can change their own password."
        )
    
    # Validate password length
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    target_user.password_hash = get_password_hash(payload.new_password)
    target_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(target_user)
    
    return target_user


