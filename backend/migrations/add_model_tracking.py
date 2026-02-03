"""
Migration: Add model tracking columns to students table
Tracks which model and detector were used for embedding generation
"""
import logging
from sqlalchemy import text, inspect
from database import engine
from config import DATABASE_TYPE

logger = logging.getLogger(__name__)


def add_model_tracking_columns():
    """Add embedding_model, embedding_detector, has_enhanced_embeddings columns if they don't exist"""
    
    columns_to_add = [
        ("embedding_model", "VARCHAR(50)"),
        ("embedding_detector", "VARCHAR(50)"),
        ("has_enhanced_embeddings", "BOOLEAN DEFAULT FALSE")
    ]
    
    try:
        # Use SQLAlchemy inspector for database-agnostic column check
        inspector = inspect(engine)
        
        # Check if students table exists
        if 'students' not in inspector.get_table_names():
            logger.info("Students table doesn't exist yet, skipping migration")
            return True
            
        existing_columns = {col['name'] for col in inspector.get_columns('students')}
        
        with engine.connect() as conn:
            for col_name, col_type in columns_to_add:
                if col_name not in existing_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE students ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        logger.info(f"✅ Added column: {col_name}")
                    except Exception as e:
                        logger.warning(f"Column {col_name} might already exist: {e}")
                else:
                    logger.info(f"Column {col_name} already exists")
                    
        logger.info("✅ Model tracking columns migration complete")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    add_model_tracking_columns()
