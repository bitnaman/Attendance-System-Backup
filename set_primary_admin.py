#!/usr/bin/env python3
"""
Set a user as the primary immutable superadmin.
This admin cannot be deleted or modified by other admins.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import SessionLocal, User

def list_superadmins(db):
    """List all superadmin users"""
    admins = db.query(User).filter(User.role == "superadmin").all()
    if not admins:
        print("❌ No superadmin users found in the database.")
        return []
    
    print("\n📋 Current Superadmin Users:")
    print("=" * 70)
    for admin in admins:
        primary_marker = "👑 PRIMARY" if admin.is_primary_admin else ""
        active_marker = "✅" if admin.is_active else "❌"
        print(f"  [{admin.id}] {admin.username:<20} {active_marker} {primary_marker}")
    print("=" * 70)
    return admins

def set_primary_admin():
    """Set a user as the primary immutable superadmin"""
    db = SessionLocal()
    try:
        print("🔒 Set Primary Immutable Superadmin")
        print("=" * 70)
        
        # List existing superadmins
        admins = list_superadmins(db)
        if not admins:
            return False
        
        # Check if primary admin already exists
        existing_primary = db.query(User).filter(User.is_primary_admin == True).first()
        if existing_primary:
            print(f"\n⚠️  Primary admin already exists: {existing_primary.username}")
            response = input("Do you want to change it? (yes/no): ").strip().lower()
            if response != 'yes':
                print("Operation cancelled.")
                return False
            
            # Remove primary status from existing
            existing_primary.is_primary_admin = False
            db.commit()
            print(f"✅ Removed primary status from {existing_primary.username}")
        
        # Get user choice
        print("\nEnter the ID of the user to set as primary admin:")
        print("(This user will be protected and cannot be deleted/modified)")
        
        try:
            user_id = int(input("User ID: ").strip())
        except ValueError:
            print("❌ Invalid user ID")
            return False
        
        # Find the user
        user = db.query(User).filter(User.id == user_id, User.role == "superadmin").first()
        if not user:
            print(f"❌ Superadmin user with ID {user_id} not found")
            return False
        
        # Confirm
        print(f"\n⚠️  You are about to set '{user.username}' as the PRIMARY ADMIN")
        print("This user will be:")
        print("  • Protected from deletion")
        print("  • Protected from role changes")
        print("  • The only admin that can modify other primary admins")
        
        confirm = input("\nAre you sure? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Operation cancelled.")
            return False
        
        # Set as primary admin
        user.is_primary_admin = True
        db.commit()
        
        print("\n✅ Primary admin set successfully!")
        print(f"   👑 Username: {user.username}")
        print(f"   🆔 User ID: {user.id}")
        print(f"   🔒 Status: Protected & Immutable")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting primary admin: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def create_new_primary_admin():
    """Create a brand new primary admin user"""
    db = SessionLocal()
    try:
        from backend.routers.auth import get_password_hash
        
        print("\n👑 Create New Primary Superadmin")
        print("=" * 70)
        
        # Check if primary admin already exists
        existing_primary = db.query(User).filter(User.is_primary_admin == True).first()
        if existing_primary:
            print(f"❌ Primary admin already exists: {existing_primary.username}")
            print("   Use option 1 to change the primary admin.")
            return False
        
        username = input("Enter username: ").strip()
        if not username:
            print("❌ Username cannot be empty")
            return False
        
        # Check if username exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"❌ Username '{username}' already exists")
            return False
        
        password = input("Enter password (min 6 characters): ").strip()
        if len(password) < 6:
            print("❌ Password must be at least 6 characters")
            return False
        
        # Create user
        user = User(
            username=username,
            password_hash=get_password_hash(password),
            role="superadmin",
            is_active=True,
            is_primary_admin=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print("\n✅ Primary superadmin created successfully!")
        print(f"   👑 Username: {username}")
        print(f"   🆔 User ID: {user.id}")
        print(f"   🔒 Status: Primary & Protected")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating primary admin: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("\n🎓 Facial Attendance System - Primary Admin Setup")
    print("=" * 70)
    
    try:
        print("\nWhat would you like to do?")
        print("  1. Set existing superadmin as primary")
        print("  2. Create new primary superadmin")
        print("  3. Exit")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == "1":
            success = set_primary_admin()
        elif choice == "2":
            success = create_new_primary_admin()
        elif choice == "3":
            print("👋 Goodbye!")
            sys.exit(0)
        else:
            print("❌ Invalid choice")
            sys.exit(1)
        
        if success:
            print("\n🎉 Operation completed successfully!")
        else:
            print("\n💥 Operation failed. Please check the error messages above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n👋 Operation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
