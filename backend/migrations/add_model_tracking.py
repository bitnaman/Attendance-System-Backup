"""
Migration: Add model tracking columns to students table
Tracks which model and detector were used for embedding generation
"""
import logging
from sqlalchemy import Column, String, Boolean, text
from database import engine

logger = logging.getLogger(__name__)


def add_model_tracking_columns():
    """Add embedding_model, embedding_detector, has_enhanced_embeddings columns if they don't exist"""
    
    columns_to_add = [
        ("embedding_model", "VARCHAR(50)"),
        ("embedding_detector", "VARCHAR(50)"),
        ("has_enhanced_embeddings", "BOOLEAN DEFAULT 0")
    ]
    
    try:
        with engine.connect() as conn:
            # Check which columns already exist
            result = conn.execute(text("PRAGMA table_info(students)"))
            existing_columns = {row[1] for row in result.fetchall()}
            
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
