"""
Database migration utilities for the Dental Attendance System.

Handles schema migrations and database setup.
"""

import logging
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

def _get_table_columns(conn, table_name: str):
    try:
        cursor = conn.execute(f"PRAGMA table_info('{table_name}')")
        return {row[1] for row in cursor.fetchall()}  # column names set
    except Exception:
        return set()

def _add_column_if_missing(conn, table: str, column: str, ddl: str):
    existing = _get_table_columns(conn, table)
    if column not in existing:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
            logger.info(f"🔧 Added missing column: {table}.{column}")
        except Exception as e:
            logger.error(f"Failed adding column {table}.{column}: {e}")

def run_light_migrations(engine):
    """Best-effort, non-destructive SQLite migrations to sync older DBs."""
    try:
        with engine.begin() as conn:
            # students table expected columns
            _add_column_if_missing(conn, "students", "email", "TEXT")
            _add_column_if_missing(conn, "students", "phone", "TEXT")
            _add_column_if_missing(conn, "students", "photo_path", "TEXT")
            _add_column_if_missing(conn, "students", "face_encoding_path", "TEXT")
            _add_column_if_missing(conn, "students", "is_active", "BOOLEAN DEFAULT 1")
            _add_column_if_missing(conn, "students", "created_at", "DATETIME")
            _add_column_if_missing(conn, "students", "updated_at", "DATETIME")

            # attendance_sessions optional columns
            _add_column_if_missing(conn, "attendance_sessions", "photo_path", "TEXT")
            _add_column_if_missing(conn, "attendance_sessions", "total_detected", "INTEGER DEFAULT 0")
            _add_column_if_missing(conn, "attendance_sessions", "total_present", "INTEGER DEFAULT 0")
            _add_column_if_missing(conn, "attendance_sessions", "confidence_avg", "REAL DEFAULT 0.0")
            _add_column_if_missing(conn, "attendance_sessions", "created_at", "DATETIME")

            # attendance_records optional columns - CRITICAL: Add missing confidence column
            _add_column_if_missing(conn, "attendance_records", "confidence", "REAL DEFAULT 0.0")
            _add_column_if_missing(conn, "attendance_records", "detection_details", "TEXT")
            _add_column_if_missing(conn, "attendance_records", "created_at", "DATETIME")
            
    except Exception as e:
        logger.error(f"Migration step failed: {e}")


def run_pg_light_migrations(engine):
    """Best-effort, non-destructive migrations to add new columns."""
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

            logger.info("✅ SQLite light migrations applied (columns ensured)")
    except Exception as e:
        logger.error(f"SQLite migration step failed: {e}")