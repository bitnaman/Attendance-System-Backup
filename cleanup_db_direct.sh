#!/bin/bash

# Direct database cleanup for PostgreSQL
echo "🗄️ Direct Database Cleanup"
echo "========================="

# Database connection details
DB_NAME="dental_attendance"
DB_USER="postgres"

echo "Connecting to database: $DB_NAME"

# Create SQL commands
SQL_CLEANUP="
-- Delete all attendance records first (due to foreign key constraints)
DELETE FROM attendance_records;

-- Delete all attendance sessions
DELETE FROM attendance_sessions;

-- Delete all students
DELETE FROM students;

-- Reset sequences
ALTER SEQUENCE IF EXISTS attendance_records_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attendance_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS students_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT 'students' as table_name, COUNT(*) as remaining_records FROM students
UNION ALL
SELECT 'attendance_sessions' as table_name, COUNT(*) as remaining_records FROM attendance_sessions
UNION ALL
SELECT 'attendance_records' as table_name, COUNT(*) as remaining_records FROM attendance_records;
"

# Try different connection methods
echo "Attempting database cleanup..."

if command -v psql > /dev/null; then
    # Try connecting as postgres user
    if psql -d "$DB_NAME" -c "$SQL_CLEANUP" 2>/dev/null; then
        echo "✅ Database cleanup successful!"
    elif sudo -u postgres psql -d "$DB_NAME" -c "$SQL_CLEANUP" 2>/dev/null; then
        echo "✅ Database cleanup successful (using sudo)!"
    elif psql postgresql://localhost:5432/"$DB_NAME" -c "$SQL_CLEANUP" 2>/dev/null; then
        echo "✅ Database cleanup successful (using connection string)!"
    else
        echo "❌ Direct database access failed. Creating manual SQL file..."
        echo "$SQL_CLEANUP" > /tmp/manual_cleanup.sql
        echo "Please run manually: psql -d $DB_NAME -f /tmp/manual_cleanup.sql"
        echo "Or check your database connection settings."
    fi
else
    echo "❌ psql not found. Please install PostgreSQL client tools."
fi

echo "Done."
