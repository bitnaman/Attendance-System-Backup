"""
Fix missing timestamps in subjects table
"""
from database import SessionLocal
from sqlalchemy import text
from datetime import datetime

db = SessionLocal()

try:
    # Update subjects with NULL timestamps
    result = db.execute(text("""
        UPDATE subjects 
        SET created_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE created_at IS NULL OR updated_at IS NULL
    """))
    
    db.commit()
    
    rows_updated = result.rowcount
    print(f"✅ Updated {rows_updated} subjects with proper timestamps")
    
    # Verify
    verify = db.execute(text("SELECT COUNT(*) FROM subjects WHERE created_at IS NULL OR updated_at IS NULL"))
    null_count = verify.scalar()
    
    if null_count == 0:
        print("✅ All subjects now have proper timestamps!")
    else:
        print(f"⚠️ Still {null_count} subjects with NULL timestamps")
        
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

