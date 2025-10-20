#!/usr/bin/env python3
"""
Script to create the initial superadmin user for the Facial Attendance System.
Run this script if you're having trouble with the bootstrap endpoint.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import SessionLocal, User
from backend.routers.auth import get_password_hash

def create_superadmin():
    """Create the initial superadmin user"""
    db = SessionLocal()
    try:
        # Check if any users exist
        user_count = db.query(User).count()
        if user_count > 0:
            print("❌ Users already exist in the database.")
            print("If you want to create a new superadmin, please use the web interface.")
            return False
        
        # Get admin credentials
        print("👑 Creating Super Administrator Account")
        print("=" * 50)
        
        username = input("Enter admin username: ").strip()
        if not username:
            print("❌ Username cannot be empty")
            return False
            
        password = input("Enter admin password (min 6 characters): ").strip()
        if len(password) < 6:
            print("❌ Password must be at least 6 characters long")
            return False
            
        # Create the superadmin user
        user = User(
            username=username,
            password_hash=get_password_hash(password),
            role="superadmin",
            is_active=True,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print("✅ Super Administrator created successfully!")
        print(f"   Username: {username}")
        print(f"   Role: superadmin")
        print(f"   User ID: {user.id}")
        print("\n🌐 You can now log in to the web interface:")
        print("   1. Start the backend: python3 backend/main.py")
        print("   2. Start the frontend: npm start")
        print("   3. Go to http://localhost:3000")
        print("   4. Login with your credentials")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating superadmin: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🎓 Facial Attendance System - Admin Setup")
    print("=" * 50)
    
    try:
        success = create_superadmin()
        if success:
            print("\n🎉 Setup completed successfully!")
        else:
            print("\n💥 Setup failed. Please check the error messages above.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n👋 Setup cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
