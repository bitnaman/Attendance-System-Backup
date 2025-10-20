"""
Migration script to add primary admin protection.

This script:
1. Adds is_primary_admin column to users table
2. Sets bitnaman as the primary admin
3. Primary admins cannot have their role or password changed by others
"""

import sys
from sqlalchemy import create_engine, text
from config import DATABASE_URL

def run_migration():
    """Add primary admin protection to users table"""
    engine = create_engine(DATABASE_URL)
    
    print("🔧 Starting Primary Admin Protection Migration...")
    print("=" * 60)
    
    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()
        
        try:
            # Step 1: Add is_primary_admin column if it doesn't exist
            print("\n📝 Step 1: Adding is_primary_admin column...")
            
            # Check if column already exists
            check_column = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='is_primary_admin';
            """)
            result = connection.execute(check_column)
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                add_column = text("""
                    ALTER TABLE users 
                    ADD COLUMN is_primary_admin BOOLEAN DEFAULT FALSE;
                """)
                connection.execute(add_column)
                print("   ✅ Column is_primary_admin added successfully!")
            else:
                print("   ℹ️ Column is_primary_admin already exists, skipping...")
            
            # Step 2: Set bitnaman as primary admin
            print("\n👑 Step 2: Setting bitnaman as primary admin...")
            
            update_bitnaman = text("""
                UPDATE users 
                SET is_primary_admin = TRUE 
                WHERE username = 'bitnaman';
            """)
            result = connection.execute(update_bitnaman)
            
            if result.rowcount > 0:
                print(f"   ✅ bitnaman marked as primary admin!")
            else:
                print("   ⚠️ User 'bitnaman' not found in database!")
                print("   ℹ️ This is OK if bitnaman hasn't been created yet.")
            
            # Step 3: Verify the changes
            print("\n🔍 Step 3: Verifying changes...")
            
            verify_query = text("""
                SELECT id, username, role, is_active, is_primary_admin
                FROM users
                WHERE is_primary_admin = TRUE;
            """)
            result = connection.execute(verify_query)
            primary_admins = result.fetchall()
            
            if primary_admins:
                print(f"   ✅ Found {len(primary_admins)} primary admin(s):")
                for admin in primary_admins:
                    print(f"      - ID: {admin[0]}, Username: {admin[1]}, Role: {admin[2]}, Active: {admin[3]}")
            else:
                print("   ⚠️ No primary admins found yet.")
            
            # Commit transaction
            trans.commit()
            
            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("\n🔒 Primary Admin Protection Status:")
            print("   - bitnaman is now protected")
            print("   - Cannot have role changed by others")
            print("   - Cannot have password changed by others")
            print("   - Can reset anyone else's password")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {e}")
            print("   Rolling back changes...")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()

