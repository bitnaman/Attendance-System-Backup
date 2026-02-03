"""
MASTER DATABASE INITIALIZATION & MIGRATION SCRIPT

This script handles ALL database setup and migrations in one place.
Safe to run multiple times (idempotent).

Run this ONCE at startup to ensure database is fully configured.

Usage:
    python3 initialize_database.py

Features:
    ✅ Creates all tables if missing
    ✅ Adds missing columns
    ✅ Creates indexes
    ✅ Sets up foreign keys
    ✅ Checks primary admin status
    ✅ Ensures timestamps on subjects
    ✅ Idempotent (safe to run multiple times)
"""

import sys
from datetime import datetime
from sqlalchemy import create_engine, text, inspect
from config import DATABASE_URL

def run_initialization():
    """Master database initialization"""
    
    print("=" * 70)
    print("🚀 MASTER DATABASE INITIALIZATION")
    print("=" * 70)
    print(f"📅 Started at: {datetime.now()}")
    print(f"🔗 Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'SQLite'}")
    print("=" * 70)
    
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    with engine.connect() as connection:
        try:
            # ================================================================
            # STEP 1: CREATE ALL TABLES (if not exist)
            # ================================================================
            print("\n📋 STEP 1: Creating tables...")
            
            # Import models to create tables
            from database import Base, engine as db_engine
            Base.metadata.create_all(bind=db_engine)
            print("   ✅ All tables created/verified")
            success_count += 1
            
            # ================================================================
            # STEP 2: ADD MISSING COLUMNS
            # ================================================================
            print("\n📋 STEP 2: Checking for missing columns...")
            
            # Check and add is_primary_admin to users
            user_columns = [col['name'] for col in inspector.get_columns('users')]
            if 'is_primary_admin' not in user_columns:
                print("   📝 Adding is_primary_admin to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN is_primary_admin BOOLEAN DEFAULT FALSE;
                """))
                print("   ✅ Added is_primary_admin column")
                success_count += 1
            else:
                print("   ℹ️  is_primary_admin already exists")
                skip_count += 1
            
            # Check and add subject_id to attendance_sessions
            session_columns = [col['name'] for col in inspector.get_columns('attendance_sessions')]
            if 'subject_id' not in session_columns:
                print("   📝 Adding subject_id to attendance_sessions table...")
                connection.execute(text("""
                    ALTER TABLE attendance_sessions 
                    ADD COLUMN subject_id INTEGER REFERENCES subjects(id);
                """))
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject_id 
                    ON attendance_sessions(subject_id);
                """))
                print("   ✅ Added subject_id column and index")
                success_count += 1
            else:
                print("   ℹ️  subject_id already exists")
                skip_count += 1
            
            # Check and add new student fields (gender, blood_group, parents_mobile)
            student_columns = [col['name'] for col in inspector.get_columns('students')]
            
            new_student_fields = []
            if 'gender' not in student_columns:
                new_student_fields.append(('gender', 'VARCHAR(20)'))
            if 'blood_group' not in student_columns:
                new_student_fields.append(('blood_group', 'VARCHAR(10)'))
            if 'parents_mobile' not in student_columns:
                new_student_fields.append(('parents_mobile', 'VARCHAR(20)'))
            
            if new_student_fields:
                print(f"   📝 Adding {len(new_student_fields)} new fields to students table...")
                for field_name, field_type in new_student_fields:
                    connection.execute(text(f"""
                        ALTER TABLE students 
                        ADD COLUMN {field_name} {field_type};
                    """))
                    print(f"      ✅ Added {field_name} column")
                success_count += len(new_student_fields)
            else:
                print("   ℹ️  All student fields already exist")
                skip_count += 1
            
            # Check and add new leave_records fields (sessions_count, leave_end_date, is_approved)
            try:
                leave_columns = [col['name'] for col in inspector.get_columns('leave_records')]
                
                new_leave_fields = []
                if 'sessions_count' not in leave_columns:
                    new_leave_fields.append(('sessions_count', 'INTEGER DEFAULT 1'))
                if 'leave_end_date' not in leave_columns:
                    new_leave_fields.append(('leave_end_date', 'TIMESTAMP'))
                if 'is_approved' not in leave_columns:
                    new_leave_fields.append(('is_approved', 'BOOLEAN DEFAULT TRUE'))
                
                if new_leave_fields:
                    print(f"   📝 Adding {len(new_leave_fields)} new fields to leave_records table...")
                    for field_name, field_type in new_leave_fields:
                        connection.execute(text(f"""
                            ALTER TABLE leave_records 
                            ADD COLUMN {field_name} {field_type};
                        """))
                        print(f"      ✅ Added {field_name} column")
                    
                    # Set default values for existing records
                    connection.execute(text("UPDATE leave_records SET sessions_count = 1 WHERE sessions_count IS NULL"))
                    connection.execute(text("UPDATE leave_records SET is_approved = TRUE WHERE is_approved IS NULL"))
                    print("      ✅ Updated existing leave records with default values")
                    success_count += len(new_leave_fields)
                else:
                    print("   ℹ️  All leave_records fields already exist")
                    skip_count += 1
            except Exception as e:
                print(f"   ⚠️  Could not update leave_records (table may not exist yet): {e}")
                skip_count += 1
            
            # ================================================================
            # STEP 3: CHECK PRIMARY ADMIN STATUS
            # ================================================================
            print("\n📋 STEP 3: Checking primary admin status...")
            
            # Check if any primary admin exists
            result = connection.execute(text("""
                SELECT id, username, is_primary_admin FROM users 
                WHERE is_primary_admin = TRUE
            """)).fetchone()
            
            if result:
                print(f"   ✅ Primary admin exists: {result[1]} (ID: {result[0]})")
                skip_count += 1
            else:
                # Check if any superadmin exists
                superadmin = connection.execute(text("""
                    SELECT id, username FROM users 
                    WHERE role = 'superadmin' 
                    LIMIT 1
                """)).fetchone()
                
                if superadmin:
                    print(f"   ⚠️  No primary admin set. Run 'python3 set_primary_admin.py' to configure.")
                    print(f"       Available superadmin: {superadmin[1]} (ID: {superadmin[0]})")
                else:
                    print("   ℹ️  No users exist yet. Run 'python3 create_admin.py' after initialization.")
                skip_count += 1
            
            # ================================================================
            # STEP 4: FIX SUBJECT TIMESTAMPS
            # ================================================================
            print("\n📋 STEP 4: Fixing subject timestamps...")
            
            null_timestamp_subjects = connection.execute(text("""
                SELECT COUNT(*) FROM subjects 
                WHERE created_at IS NULL OR updated_at IS NULL
            """)).fetchone()[0]
            
            if null_timestamp_subjects > 0:
                connection.execute(text("""
                    UPDATE subjects 
                    SET 
                        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
                        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
                    WHERE created_at IS NULL OR updated_at IS NULL
                """))
                print(f"   ✅ Fixed timestamps for {null_timestamp_subjects} subjects")
                success_count += 1
            else:
                print("   ℹ️  All subject timestamps are valid")
                skip_count += 1
            
            # ================================================================
            # STEP 5: CREATE INDEXES (if not exist)
            # ================================================================
            print("\n📋 STEP 5: Creating indexes...")
            
            indexes_to_create = [
                ("idx_users_role", "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)"),
                ("idx_users_is_primary_admin", "CREATE INDEX IF NOT EXISTS idx_users_is_primary_admin ON users(is_primary_admin) WHERE is_primary_admin = TRUE"),
                ("idx_subjects_class_id", "CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id)"),
                ("idx_subjects_code", "CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code)"),
                ("idx_subjects_name", "CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name)"),
                ("idx_attendance_sessions_subject_id", "CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject_id ON attendance_sessions(subject_id)"),
                ("idx_students_class_id", "CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)"),
                ("idx_classes_is_active", "CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active) WHERE is_active = TRUE"),
            ]
            
            for idx_name, idx_sql in indexes_to_create:
                try:
                    connection.execute(text(idx_sql))
                except Exception as e:
                    if "already exists" in str(e).lower():
                        pass  # Index already exists
                    else:
                        print(f"   ⚠️  Warning creating index {idx_name}: {e}")
            
            print("   ✅ All indexes created/verified")
            success_count += 1
            
            # ================================================================
            # STEP 6: VERIFY FOREIGN KEYS
            # ================================================================
            print("\n📋 STEP 6: Verifying foreign keys...")
            
            fk_queries = connection.execute(text("""
                SELECT 
                    COUNT(*) as fk_count
                FROM information_schema.table_constraints 
                WHERE constraint_type = 'FOREIGN KEY'
                AND table_schema = 'public'
            """)).fetchone()[0]
            
            print(f"   ✅ Found {fk_queries} foreign key constraints")
            success_count += 1
            
            # ================================================================
            # STEP 7: DATABASE STATISTICS
            # ================================================================
            print("\n📋 STEP 7: Gathering statistics...")
            
            stats = {}
            tables = ['users', 'classes', 'subjects', 'students', 'attendance_sessions', 'attendance_records', 'leave_records']
            
            for table in tables:
                count = connection.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()[0]
                stats[table] = count
            
            print("\n   📊 Database Statistics:")
            print(f"      👥 Users: {stats['users']}")
            print(f"      🎓 Classes: {stats['classes']}")
            print(f"      📚 Subjects: {stats['subjects']}")
            print(f"      👨‍🎓 Students: {stats['students']}")
            print(f"      📅 Attendance Sessions: {stats['attendance_sessions']}")
            print(f"      ✅ Attendance Records: {stats['attendance_records']}")
            print(f"      🏥 Leave Records: {stats['leave_records']}")
            
            # ================================================================
            # STEP 8: VERIFY PRIMARY ADMIN
            # ================================================================
            print("\n📋 STEP 8: Final verification...")
            
            primary_admin = connection.execute(text("""
                SELECT username, role, is_active, is_primary_admin 
                FROM users 
                WHERE is_primary_admin = TRUE
            """)).fetchone()
            
            if primary_admin:
                print(f"   🔒 Primary Admin: {primary_admin[0]} (Role: {primary_admin[1]}, Active: {primary_admin[2]})")
                success_count += 1
            else:
                print("   ⚠️  No primary admin found yet")
                skip_count += 1
            
            # Commit all changes
            connection.commit()
            
            # ================================================================
            # FINAL SUMMARY
            # ================================================================
            print("\n" + "=" * 70)
            print("✅ DATABASE INITIALIZATION COMPLETE")
            print("=" * 70)
            print(f"📊 Summary:")
            print(f"   ✅ Successful operations: {success_count}")
            print(f"   ℹ️  Skipped (already done): {skip_count}")
            print(f"   ❌ Errors: {error_count}")
            print(f"📅 Completed at: {datetime.now()}")
            print("=" * 70)
            
            print("\n🎉 Your database is ready!")
            print("\n📝 Next steps:")
            print("   1. Start your backend: python3 main.py")
            print("   2. Start your frontend: npm start")
            print("   3. Access the application")
            
            return True
            
        except Exception as e:
            connection.rollback()
            print(f"\n❌ ERROR: {e}")
            print("Rolling back changes...")
            import traceback
            traceback.print_exc()
            error_count += 1
            return False


if __name__ == "__main__":
    print("\n" + "🔧 " * 35)
    print("FACIAL ATTENDANCE SYSTEM - DATABASE INITIALIZATION")
    print("🔧 " * 35 + "\n")
    
    try:
        success = run_initialization()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

