"""
Database migration utilities for the Dental Attendance System.

Handles schema migrations and database setup.
"""

import logging
from sqlalchemy import create_engine, text, inspect
from config import DATABASE_TYPE

logger = logging.getLogger(__name__)

def _get_table_columns(conn, table_name: str, engine=None):
    """Get column names for a table - works with both SQLite and PostgreSQL"""
    try:
        if DATABASE_TYPE == "postgresql":
            # Use SQLAlchemy inspector for PostgreSQL
            if engine:
                inspector = inspect(engine)
                return {col['name'] for col in inspector.get_columns(table_name)}
            else:
                # Fallback to information_schema query
                result = conn.execute(text(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = '{table_name}' AND table_schema = 'public'
                """))
                return {row[0] for row in result.fetchall()}
        else:
            # SQLite
            cursor = conn.execute(text(f"PRAGMA table_info('{table_name}')"))
            return {row[1] for row in cursor.fetchall()}
    except Exception as e:
        logger.warning(f"Could not get columns for {table_name}: {e}")
        return set()

def _add_column_if_missing(conn, table: str, column: str, ddl: str, engine=None):
    """Add column if it doesn't exist - works with both SQLite and PostgreSQL"""
    existing = _get_table_columns(conn, table, engine)
    if column not in existing:
        try:
            if DATABASE_TYPE == "postgresql":
                # PostgreSQL uses ADD COLUMN IF NOT EXISTS in newer versions
                # but for compatibility, we check first
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            else:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            logger.info(f"🔧 Added missing column: {table}.{column}")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                logger.debug(f"Column {table}.{column} already exists")
            else:
                logger.error(f"Failed adding column {table}.{column}: {e}")

def run_light_migrations(engine):
    """Best-effort, non-destructive migrations to sync older DBs. Supports both SQLite and PostgreSQL."""
    db_type = "PostgreSQL" if DATABASE_TYPE == "postgresql" else "SQLite"
    logger.info(f"🔄 Running light migrations for {db_type}...")
    
    # Use appropriate data types based on database
    if DATABASE_TYPE == "postgresql":
        bool_default_true = "BOOLEAN DEFAULT TRUE"
        datetime_type = "TIMESTAMP"
        float_type = "DOUBLE PRECISION DEFAULT 0.0"
    else:
        bool_default_true = "BOOLEAN DEFAULT 1"
        datetime_type = "DATETIME"
        float_type = "REAL DEFAULT 0.0"
    
    try:
        with engine.begin() as conn:
            # students table expected columns
            _add_column_if_missing(conn, "students", "email", "TEXT", engine)
            _add_column_if_missing(conn, "students", "phone", "TEXT", engine)
            _add_column_if_missing(conn, "students", "photo_path", "TEXT", engine)
            _add_column_if_missing(conn, "students", "face_encoding_path", "TEXT", engine)
            _add_column_if_missing(conn, "students", "is_active", bool_default_true, engine)
            _add_column_if_missing(conn, "students", "created_at", datetime_type, engine)
            _add_column_if_missing(conn, "students", "updated_at", datetime_type, engine)

            # attendance_sessions optional columns
            _add_column_if_missing(conn, "attendance_sessions", "photo_path", "TEXT", engine)
            _add_column_if_missing(conn, "attendance_sessions", "total_detected", "INTEGER DEFAULT 0", engine)
            _add_column_if_missing(conn, "attendance_sessions", "total_present", "INTEGER DEFAULT 0", engine)
            _add_column_if_missing(conn, "attendance_sessions", "confidence_avg", float_type, engine)
            _add_column_if_missing(conn, "attendance_sessions", "created_at", datetime_type, engine)

            # attendance_records optional columns - CRITICAL: Add missing confidence column
            _add_column_if_missing(conn, "attendance_records", "confidence", float_type, engine)
            _add_column_if_missing(conn, "attendance_records", "detection_details", "TEXT", engine)
            _add_column_if_missing(conn, "attendance_records", "created_at", datetime_type, engine)
            
        logger.info(f"✅ {db_type} light migrations completed")
    except Exception as e:
        logger.error(f"Migration step failed: {e}")


def run_pg_light_migrations(engine):
    """Best-effort, non-destructive PostgreSQL migrations to add new columns."""
    try:
        with engine.begin() as conn:
            # attendance_sessions: add session_type
            conn.execute(text("""
                ALTER TABLE IF EXISTS attendance_sessions
                ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'normal'
            """))

            # attendance_records: add status, note, attachment_path
            conn.execute(text("""
                ALTER TABLE IF EXISTS attendance_records
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'auto'
            """))
            conn.execute(text("""
                ALTER TABLE IF EXISTS attendance_records
                ADD COLUMN IF NOT EXISTS note TEXT
            """))
            conn.execute(text("""
                ALTER TABLE IF EXISTS attendance_records
                ADD COLUMN IF NOT EXISTS attachment_path VARCHAR(500)
            """))

            logger.info("✅ PostgreSQL light migrations applied (columns ensured)")
    except Exception as e:
        logger.error(f"PostgreSQL migration step failed: {e}")