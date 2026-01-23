"""
Migration: Add Leave Sessions Columns
=====================================
Adds sessions_count, leave_end_date, and is_approved columns to the leave_records table.

Run this migration:
    python3 migrations/add_leave_sessions_columns.py

This migration is idempotent - safe to run multiple times.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from config import DATABASE_URL

def run_migration():
    """Add new columns to leave_records table for session-based attendance calculation"""
    
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    # Check if leave_records table exists
    if 'leave_records' not in inspector.get_table_names():
        print("❌ leave_records table does not exist. Run initialize_database.py first.")
        return False
    
    # Get existing columns
    existing_columns = {col['name'] for col in inspector.get_columns('leave_records')}
    
    with engine.connect() as conn:
        # Check database type
        is_sqlite = 'sqlite' in str(DATABASE_URL).lower()
        
        # Add sessions_count column (default 1)
        if 'sessions_count' not in existing_columns:
            try:
                if is_sqlite:
                    conn.execute(text("ALTER TABLE leave_records ADD COLUMN sessions_count INTEGER DEFAULT 1 NOT NULL"))
                else:
                    # PostgreSQL
                    conn.execute(text("ALTER TABLE leave_records ADD COLUMN sessions_count INTEGER DEFAULT 1 NOT NULL"))
                conn.commit()
                print("✅ Added sessions_count column")
            except Exception as e:
                print(f"⚠️ sessions_count column may already exist: {e}")
        else:
            print("ℹ️ sessions_count column already exists")
        
        # Add leave_end_date column (nullable datetime)
        if 'leave_end_date' not in existing_columns:
            try:
                if is_sqlite:
                    conn.execute(text("ALTER TABLE leave_records ADD COLUMN leave_end_date DATETIME"))
                else:
                    # PostgreSQL
                    conn.execute(text("ALTER TABLE leave_records ADD COLUMN leave_end_date TIMESTAMP"))
                conn.commit()
                print("✅ Added leave_end_date column")
            except Exception as e:
                print(f"⚠️ leave_end_date column may already exist: {e}")
        else:
            print("ℹ️ leave_end_date column already exists")
        
        # Add is_approved column (default True - auto-approve existing records)
        if 'is_approved' not in existing_columns:
            try:
                if is_sqlite:
                    conn.execute(text("ALTER TABLE leave_records ADD COLUMN is_approved BOOLEAN DEFAULT 1"))
                else:
                    # PostgreSQL
                    conn.execute(text("ALTER TABLE leave_records ADD COLUMN is_approved BOOLEAN DEFAULT TRUE"))
                conn.commit()
                print("✅ Added is_approved column")
            except Exception as e:
                print(f"⚠️ is_approved column may already exist: {e}")
        else:
            print("ℹ️ is_approved column already exists")
        
        # Update existing records to have is_approved = True and sessions_count = 1
        try:
            conn.execute(text("UPDATE leave_records SET sessions_count = 1 WHERE sessions_count IS NULL"))
            conn.execute(text("UPDATE leave_records SET is_approved = 1 WHERE is_approved IS NULL"))
            conn.commit()
            print("✅ Updated existing records with default values")
        except Exception as e:
            print(f"ℹ️ Could not update existing records (may not be needed): {e}")
    
    print("\n✅ Migration completed successfully!")
    print("\n📋 Summary of changes:")
    print("   - sessions_count: Number of lecture sessions covered by leave (for attendance calculation)")
    print("   - leave_end_date: Optional end date for multi-day leaves")
    print("   - is_approved: Boolean flag to approve/unapprove leave requests")
    print("\n💡 Approved leaves now count towards attendance percentage:")
    print("   effective_attendance = (present + approved_leave_sessions) / total × 100")
    
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("Leave Sessions Migration")
    print("=" * 60)
    print()
    
    success = run_migration()
    sys.exit(0 if success else 1)
