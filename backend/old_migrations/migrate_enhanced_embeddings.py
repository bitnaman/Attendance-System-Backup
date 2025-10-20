#!/usr/bin/env python3
"""
Database migration script to add enhanced embedding fields
This script safely adds new columns without breaking existing data
"""
import os
import sys
import logging
from sqlalchemy import text
from database import engine, SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Run the migration to add enhanced embedding fields"""
    logger.info("🚀 Starting enhanced embedding migration...")
    
    # SQL commands to add new columns
    migration_commands = [
        """
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS embedding_variants_path VARCHAR(500);
        """,
        """
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS embedding_metadata_path VARCHAR(500);
        """,
        """
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS embedding_confidence FLOAT DEFAULT 0.8;
        """,
        """
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS adaptive_threshold FLOAT DEFAULT 0.6;
        """
    ]
    
    try:
        with engine.connect() as connection:
            # Start transaction
            trans = connection.begin()
            
            try:
                for i, command in enumerate(migration_commands, 1):
                    logger.info(f"📝 Executing migration step {i}/4...")
                    connection.execute(text(command))
                    logger.info(f"✅ Step {i} completed")
                
                # Commit transaction
                trans.commit()
                logger.info("🎉 Migration completed successfully!")
                
                # Verify the changes
                verify_migration(connection)
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Migration failed: {e}")
                raise
                
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise

def verify_migration(connection):
    """Verify that the migration was successful"""
    logger.info("🔍 Verifying migration...")
    
    # Check if new columns exist
    result = connection.execute(text("""
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name IN ('embedding_variants_path', 'embedding_metadata_path', 'embedding_confidence', 'adaptive_threshold')
        ORDER BY column_name;
    """))
    
    columns = result.fetchall()
    
    expected_columns = {
        'embedding_variants_path': 'character varying',
        'embedding_metadata_path': 'character varying', 
        'embedding_confidence': 'real',
        'adaptive_threshold': 'real'
    }
    
    found_columns = {col[0]: col[1] for col in columns}
    
    logger.info("📊 Migration verification results:")
    for col_name, expected_type in expected_columns.items():
        if col_name in found_columns:
            logger.info(f"  ✅ {col_name}: {found_columns[col_name]} (expected: {expected_type})")
        else:
            logger.error(f"  ❌ {col_name}: NOT FOUND")
    
    if len(found_columns) == len(expected_columns):
        logger.info("🎯 All enhanced embedding columns added successfully!")
    else:
        logger.error("❌ Some columns are missing!")
        raise Exception("Migration verification failed")

def update_existing_students():
    """Update existing students with default values"""
    logger.info("🔄 Updating existing students with default values...")
    
    try:
        db = SessionLocal()
        
        # Update students that don't have the new fields set
        result = db.execute(text("""
            UPDATE students 
            SET embedding_confidence = 0.8, adaptive_threshold = 0.6
            WHERE embedding_confidence IS NULL OR adaptive_threshold IS NULL;
        """))
        
        updated_count = result.rowcount
        db.commit()
        
        logger.info(f"✅ Updated {updated_count} existing students with default values")
        
        # Get total student count
        total_students = db.execute(text("SELECT COUNT(*) FROM students")).scalar()
        logger.info(f"📊 Total students in database: {total_students}")
        
    except Exception as e:
        logger.error(f"❌ Failed to update existing students: {e}")
        raise
    finally:
        db.close()

def main():
    """Main migration function"""
    try:
        logger.info("=" * 60)
        logger.info("🎯 Enhanced Face Recognition Migration")
        logger.info("=" * 60)
        
        # Run the migration
        run_migration()
        
        # Update existing students
        update_existing_students()
        
        logger.info("=" * 60)
        logger.info("🎉 Migration completed successfully!")
        logger.info("✅ Enhanced embedding fields added to students table")
        logger.info("✅ Existing students updated with default values")
        logger.info("🚀 System ready for enhanced face recognition!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
