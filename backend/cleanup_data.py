"""
DATABASE DATA CLEANUP SCRIPT

This script ONLY deletes records from tables.
Tables, columns, and schema remain intact.

Usage:
    python3 cleanup_data.py

Features:
    ✅ Interactive menu
    ✅ Numbered options
    ✅ Confirmation required
    ✅ Permanent deletion (no recovery)
    ✅ Keeps tables intact
    ✅ Safe from accidental full deletion
"""

import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from config import DATABASE_URL

def clear_screen():
    """Clear terminal screen"""
    print("\n" * 2)

def print_header():
    """Print script header"""
    print("=" * 70)
    print("🗑️  DATABASE DATA CLEANUP UTILITY")
    print("=" * 70)
    print("⚠️  WARNING: This will PERMANENTLY DELETE data!")
    print("   Tables and schema will remain intact.")
    print("=" * 70)
    print()

def confirm_action(action_name):
    """Get user confirmation"""
    print(f"\n⚠️  You are about to: {action_name}")
    print("   This action is PERMANENT and CANNOT be undone!")
    response = input("\nType 'YES' to confirm (anything else to cancel): ")
    return response.upper() == 'YES'

def show_stats(connection):
    """Show current database statistics"""
    print("\n📊 Current Database Statistics:")
    print("-" * 70)
    
    tables = [
        ('users', 'Users (excluding primary admin)'),
        ('students', 'Students'),
        ('classes', 'Classes'),
        ('subjects', 'Subjects'),
        ('attendance_sessions', 'Attendance Sessions'),
        ('attendance_records', 'Attendance Records'),
        ('leave_records', 'Leave Records'),
    ]
    
    for table, description in tables:
        try:
            if table == 'users':
                # Don't count primary admin
                count = connection.execute(text(f"""
                    SELECT COUNT(*) FROM {table} 
                    WHERE is_primary_admin = FALSE OR is_primary_admin IS NULL
                """)).fetchone()[0]
            else:
                count = connection.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()[0]
            print(f"   {description:40s}: {count:5d} records")
        except Exception as e:
            print(f"   {description:40s}: Error reading")
    
    print("-" * 70)

def cleanup_students(connection):
    """Delete all students"""
    print("\n🗑️  Deleting all students...")
    
    # First, get count
    count = connection.execute(text("SELECT COUNT(*) FROM students")).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No students to delete")
        return
    
    # Delete students
    connection.execute(text("DELETE FROM students"))
    connection.commit()
    
    print(f"   ✅ Deleted {count} students")
    print("   ℹ️  Associated attendance records also deleted (cascade)")

def cleanup_attendance_sessions(connection):
    """Delete all attendance sessions"""
    print("\n🗑️  Deleting all attendance sessions...")
    
    # Get count
    count = connection.execute(text("SELECT COUNT(*) FROM attendance_sessions")).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No attendance sessions to delete")
        return
    
    # Delete sessions
    connection.execute(text("DELETE FROM attendance_sessions"))
    connection.commit()
    
    print(f"   ✅ Deleted {count} attendance sessions")
    print("   ℹ️  Associated attendance records also deleted (cascade)")

def cleanup_attendance_records(connection):
    """Delete all attendance records"""
    print("\n🗑️  Deleting all attendance records...")
    
    count = connection.execute(text("SELECT COUNT(*) FROM attendance_records")).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No attendance records to delete")
        return
    
    connection.execute(text("DELETE FROM attendance_records"))
    connection.commit()
    
    print(f"   ✅ Deleted {count} attendance records")

def cleanup_leave_records(connection):
    """Delete all leave records"""
    print("\n🗑️  Deleting all leave records...")
    
    count = connection.execute(text("SELECT COUNT(*) FROM leave_records")).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No leave records to delete")
        return
    
    connection.execute(text("DELETE FROM leave_records"))
    connection.commit()
    
    print(f"   ✅ Deleted {count} leave records")

def cleanup_subjects(connection):
    """Delete all subjects"""
    print("\n🗑️  Deleting all subjects...")
    
    count = connection.execute(text("SELECT COUNT(*) FROM subjects")).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No subjects to delete")
        return
    
    connection.execute(text("DELETE FROM subjects"))
    connection.commit()
    
    print(f"   ✅ Deleted {count} subjects")

def cleanup_classes(connection):
    """Delete all classes"""
    print("\n🗑️  Deleting all classes...")
    
    count = connection.execute(text("SELECT COUNT(*) FROM classes")).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No classes to delete")
        return
    
    # This will cascade delete students, subjects, etc.
    connection.execute(text("DELETE FROM classes"))
    connection.commit()
    
    print(f"   ✅ Deleted {count} classes")
    print("   ℹ️  Cascade deleted: students, subjects, attendance sessions")

def cleanup_users(connection):
    """Delete all users except primary admin"""
    print("\n🗑️  Deleting all users (except primary admin)...")
    
    # Count non-primary admin users
    count = connection.execute(text("""
        SELECT COUNT(*) FROM users 
        WHERE is_primary_admin = FALSE OR is_primary_admin IS NULL
    """)).fetchone()[0]
    
    if count == 0:
        print("   ℹ️  No deletable users found")
        return
    
    # Delete non-primary admin users
    connection.execute(text("""
        DELETE FROM users 
        WHERE is_primary_admin = FALSE OR is_primary_admin IS NULL
    """))
    connection.commit()
    
    print(f"   ✅ Deleted {count} users")
    print("   🔒 Primary admin preserved")

def cleanup_all_data(connection):
    """Delete all data from all tables (except primary admin)"""
    print("\n🗑️  DELETING ALL DATA FROM ALL TABLES...")
    print("   (This will take a moment...)")
    
    # Order matters due to foreign keys
    # Delete in reverse dependency order
    
    print("\n   Step 1/7: Deleting attendance records...")
    connection.execute(text("DELETE FROM attendance_records"))
    
    print("   Step 2/7: Deleting leave records...")
    connection.execute(text("DELETE FROM leave_records"))
    
    print("   Step 3/7: Deleting attendance sessions...")
    connection.execute(text("DELETE FROM attendance_sessions"))
    
    print("   Step 4/7: Deleting students...")
    connection.execute(text("DELETE FROM students"))
    
    print("   Step 5/7: Deleting subjects...")
    connection.execute(text("DELETE FROM subjects"))
    
    print("   Step 6/7: Deleting classes...")
    connection.execute(text("DELETE FROM classes"))
    
    print("   Step 7/7: Deleting users (except primary admin)...")
    connection.execute(text("""
        DELETE FROM users 
        WHERE is_primary_admin = FALSE OR is_primary_admin IS NULL
    """))
    
    connection.commit()
    
    print("\n   ✅ All data deleted successfully!")
    print("   🔒 Primary admin preserved")
    print("   📋 All tables remain intact (schema preserved)")

def show_menu():
    """Display cleanup menu"""
    print("\n" + "=" * 70)
    print("SELECT CLEANUP OPERATION:")
    print("=" * 70)
    print()
    print("  1️⃣   Delete ALL Students")
    print("       → Removes all student records permanently")
    print("       → Cascades to attendance records")
    print()
    print("  2️⃣   Delete ALL Attendance Sessions")
    print("       → Removes all attendance session records")
    print("       → Cascades to attendance records")
    print()
    print("  3️⃣   Delete ALL Attendance Records")
    print("       → Removes individual attendance records only")
    print()
    print("  4️⃣   Delete ALL Leave Records")
    print("       → Removes all medical leave records")
    print()
    print("  5️⃣   Delete ALL Subjects")
    print("       → Removes all subject records")
    print()
    print("  6️⃣   Delete ALL Classes")
    print("       → Removes all class records")
    print("       → Cascades to students, subjects, attendance")
    print()
    print("  7️⃣   Delete ALL Users (except primary admin)")
    print("       → Removes all users")
    print("       → Primary admin is protected")
    print()
    print("  8️⃣   Show Current Statistics")
    print("       → Display record counts")
    print()
    print("  9️⃣   DELETE ALL DATA (NUCLEAR OPTION)")
    print("       → Removes ALL records from ALL tables")
    print("       → Primary admin preserved")
    print("       → Schema/tables remain intact")
    print()
    print("  0️⃣   Exit")
    print()
    print("=" * 70)

def main():
    """Main execution"""
    clear_screen()
    print_header()
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Show initial stats
        show_stats(connection)
        
        while True:
            show_menu()
            
            choice = input("Enter your choice (0-9): ").strip()
            
            if choice == '0':
                print("\n👋 Exiting cleanup utility...")
                print("   No changes made.")
                break
            
            elif choice == '1':
                if confirm_action("Delete ALL Students"):
                    cleanup_students(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '2':
                if confirm_action("Delete ALL Attendance Sessions"):
                    cleanup_attendance_sessions(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '3':
                if confirm_action("Delete ALL Attendance Records"):
                    cleanup_attendance_records(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '4':
                if confirm_action("Delete ALL Leave Records"):
                    cleanup_leave_records(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '5':
                if confirm_action("Delete ALL Subjects"):
                    cleanup_subjects(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '6':
                if confirm_action("Delete ALL Classes (and related data)"):
                    cleanup_classes(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '7':
                if confirm_action("Delete ALL Users (except primary admin)"):
                    cleanup_users(connection)
                    show_stats(connection)
                else:
                    print("   ❌ Cancelled")
            
            elif choice == '8':
                show_stats(connection)
            
            elif choice == '9':
                print("\n" + "🚨" * 35)
                print("⚠️  NUCLEAR OPTION - DELETE ALL DATA")
                print("🚨" * 35)
                print("\nThis will delete:")
                print("  • ALL students")
                print("  • ALL classes")
                print("  • ALL subjects")
                print("  • ALL attendance sessions")
                print("  • ALL attendance records")
                print("  • ALL leave records")
                print("  • ALL users (except primary admin)")
                print("\nOnly the primary admin will remain.")
                print("Tables and schema will stay intact.")
                
                if confirm_action("DELETE ALL DATA (NUCLEAR OPTION)"):
                    # Extra confirmation
                    print("\n⚠️  FINAL CONFIRMATION")
                    final = input("Type 'DELETE EVERYTHING' to proceed: ")
                    if final == 'DELETE EVERYTHING':
                        cleanup_all_data(connection)
                        show_stats(connection)
                    else:
                        print("   ❌ Cancelled (incorrect confirmation)")
                else:
                    print("   ❌ Cancelled")
            
            else:
                print("\n❌ Invalid choice! Please enter 0-9")
            
            input("\nPress Enter to continue...")
            clear_screen()
            print_header()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        print("   Exiting safely...")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

