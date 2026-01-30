#!/usr/bin/env python3
"""
Production Path Migration Script
=================================
This script fixes hardcoded absolute paths in the database before deployment.

Issues Fixed:
1. face_encoding_path: Contains absolute paths like /home/bitbuggy/...
2. photo_path: Contains http://localhost:8000/... URLs

After running this script, paths will be stored as relative paths:
- face_encoding_path: static/dataset/Student_Name_01/face_embedding.npy
- photo_path: /static/dataset/Student_Name_01/1.jpg

Run this script BEFORE deploying to production:
    python3 fix_production_paths.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from config import DATABASE_URL

def fix_production_paths():
    """Fix hardcoded absolute paths in the database."""
    
    engine = create_engine(DATABASE_URL)
    
    print("=" * 60)
    print("🔧 PRODUCTION PATH MIGRATION")
    print("=" * 60)
    print()
    
    with engine.connect() as conn:
        # Get all students
        result = conn.execute(text("SELECT id, name, photo_path, face_encoding_path FROM students"))
        students = result.fetchall()
        
        if not students:
            print("ℹ️  No students found in database.")
            return
        
        print(f"📊 Found {len(students)} students to process")
        print()
        
        fixed_count = 0
        
        for student in students:
            student_id, name, photo_path, encoding_path = student
            needs_update = False
            new_photo_path = photo_path
            new_encoding_path = encoding_path
            
            # Fix photo_path (remove localhost URL, keep relative path)
            if photo_path:
                if 'localhost' in photo_path or '127.0.0.1' in photo_path:
                    # Extract the /static/... part
                    if '/static/' in photo_path:
                        new_photo_path = photo_path.split('/static/')[-1]
                        new_photo_path = f"/static/{new_photo_path}"
                        needs_update = True
                        print(f"  📷 {name}: Fixing photo_path")
                        print(f"      Before: {photo_path[:60]}...")
                        print(f"      After:  {new_photo_path}")
            
            # Fix face_encoding_path (remove absolute path, keep relative)
            if encoding_path:
                if encoding_path.startswith('/home/') or encoding_path.startswith('/Users/'):
                    # Find the 'static/' part and keep from there
                    if '/static/' in encoding_path:
                        new_encoding_path = encoding_path.split('/static/')[-1]
                        new_encoding_path = f"static/{new_encoding_path}"
                        needs_update = True
                        print(f"  🧠 {name}: Fixing face_encoding_path")
                        print(f"      Before: {encoding_path[:60]}...")
                        print(f"      After:  {new_encoding_path}")
            
            # Update if needed
            if needs_update:
                conn.execute(
                    text("""
                        UPDATE students 
                        SET photo_path = :photo_path, 
                            face_encoding_path = :encoding_path 
                        WHERE id = :student_id
                    """),
                    {
                        "photo_path": new_photo_path,
                        "encoding_path": new_encoding_path,
                        "student_id": student_id
                    }
                )
                fixed_count += 1
                print()
        
        conn.commit()
        
        print("=" * 60)
        print(f"✅ Migration complete! Fixed {fixed_count} students.")
        print("=" * 60)
        
        if fixed_count > 0:
            print()
            print("⚠️  IMPORTANT: After deployment, update your .env:")
            print("   BACKEND_BASE_URL=https://your-deployed-url.com")
            print()
            print("   The photo_path now stores relative paths like:")
            print("   /static/dataset/Student_Name/1.jpg")
            print()
            print("   Your frontend/API should prefix this with BACKEND_BASE_URL")


def verify_paths():
    """Verify current path status in database."""
    engine = create_engine(DATABASE_URL)
    
    print()
    print("📊 CURRENT PATH STATUS:")
    print("-" * 60)
    
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN photo_path LIKE '%localhost%' THEN 1 ELSE 0 END) as localhost_photos,
                SUM(CASE WHEN face_encoding_path LIKE '/home/%' OR face_encoding_path LIKE '/Users/%' THEN 1 ELSE 0 END) as absolute_paths
            FROM students
        """))
        stats = result.fetchone()
        
        total, localhost, absolute = stats
        print(f"   Total Students: {total}")
        print(f"   Photo paths with localhost: {localhost}")
        print(f"   Encoding paths with absolute paths: {absolute}")
        
        if localhost > 0 or absolute > 0:
            print()
            print("   ⚠️  Issues detected! Run this script to fix.")
        else:
            print()
            print("   ✅ All paths look production-ready!")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fix production paths in database")
    parser.add_argument("--verify", action="store_true", help="Only verify, don't fix")
    parser.add_argument("--fix", action="store_true", help="Fix the paths")
    
    args = parser.parse_args()
    
    if args.verify:
        verify_paths()
    elif args.fix:
        fix_production_paths()
        verify_paths()
    else:
        print("Usage:")
        print("  python3 fix_production_paths.py --verify  # Check current status")
        print("  python3 fix_production_paths.py --fix     # Fix the paths")
        print()
        verify_paths()
