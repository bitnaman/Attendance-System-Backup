"""
Migration script to add subjects table and update attendance_sessions
Run this script to add subject management to the system
"""
import sys
import os
from sqlalchemy import text

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base, Subject
from config import DATABASE_URL

def run_migration():
    """Create subjects table and add subject_id to attendance_sessions"""
    
    print("=" * 60)
    print("SUBJECT MANAGEMENT MIGRATION")
    print("=" * 60)
    print(f"Database: {DATABASE_URL}")
    print()
    
    try:
        with engine.connect() as connection:
            print("📝 Step 1: Creating subjects table...")
            
            # Create subjects table
            create_subjects_table = text("""
                CREATE TABLE IF NOT EXISTS subjects (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    code VARCHAR(50),
                    description TEXT,
                    credits INTEGER,
                    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            connection.execute(create_subjects_table)
            connection.commit()
            print("   ✅ Subjects table created")
            
            print("\n📝 Step 2: Creating indexes on subjects table...")
            
            # Create indexes
            create_indexes = [
                text("CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);"),
                text("CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);"),
                text("CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);"),
            ]
            
            for idx_query in create_indexes:
                connection.execute(idx_query)
            connection.commit()
            print("   ✅ Indexes created")
            
            print("\n📝 Step 3: Adding subject_id column to attendance_sessions...")
            
            # Check if column already exists
            check_column = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='attendance_sessions' 
                AND column_name='subject_id';
            """)
            result = connection.execute(check_column)
            
            if result.fetchone() is None:
                # Add subject_id column
                add_subject_id = text("""
                    ALTER TABLE attendance_sessions 
                    ADD COLUMN subject_id INTEGER REFERENCES subjects(id);
                """)
                connection.execute(add_subject_id)
                connection.commit()
                print("   ✅ subject_id column added to attendance_sessions")
                
                # Create index
                create_subject_idx = text("""
                    CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject_id 
                    ON attendance_sessions(subject_id);
                """)
                connection.execute(create_subject_idx)
                connection.commit()
                print("   ✅ Index created on subject_id")
            else:
                print("   ℹ️  subject_id column already exists")
            
            print("\n📝 Step 4: Adding sample subjects for existing classes...")
            
            # Get all classes
            get_classes = text("SELECT id, name, section FROM classes WHERE is_active = TRUE;")
            result = connection.execute(get_classes)
            classes = result.fetchall()
            
            if classes:
                # Default subjects to add for each class
                default_subjects = [
                    {"name": "Mathematics", "code": "MATH"},
                    {"name": "Physics", "code": "PHY"},
                    {"name": "Chemistry", "code": "CHEM"},
                    {"name": "English", "code": "ENG"},
                    {"name": "Computer Science", "code": "CS"},
                ]
                
                for class_row in classes:
                    class_id = class_row[0]
                    class_name = class_row[1]
                    class_section = class_row[2]
                    
                    print(f"\n   Adding subjects for: {class_name} - {class_section}")
                    
                    for subject in default_subjects:
                        # Check if subject already exists
                        check_subject = text("""
                            SELECT id FROM subjects 
                            WHERE class_id = :class_id AND name = :name;
                        """)
                        result = connection.execute(
                            check_subject, 
                            {"class_id": class_id, "name": subject["name"]}
                        )
                        
                        if result.fetchone() is None:
                            # Add subject
                            insert_subject = text("""
                                INSERT INTO subjects (name, code, class_id, is_active, created_at, updated_at)
                                VALUES (:name, :code, :class_id, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                            """)
                            connection.execute(
                                insert_subject,
                                {
                                    "name": subject["name"],
                                    "code": subject["code"],
                                    "class_id": class_id
                                }
                            )
                    
                connection.commit()
                print(f"\n   ✅ Sample subjects added for {len(classes)} classes")
            else:
                print("   ℹ️  No active classes found")
            
            print("\n" + "=" * 60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("\nNext steps:")
            print("1. Restart your backend server")
            print("2. Access Subject Management in admin panel")
            print("3. Add/edit subjects as needed")
            print("4. Mark attendance with subject selection")
            print()
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

