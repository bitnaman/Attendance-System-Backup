#!/bin/bash
# Rollback script for facial recognition model upgrade
# Run this if you need to revert to the previous Facenet512 configuration

cd /home/bitbuggy/Naman_Projects/Facial_Attendance_System

echo "🔄 Rolling back to Facenet512 configuration..."

# Find the backup files
BACKUP_DIR="backend"
FACE_BACKUP=$(ls -t ${BACKUP_DIR}/face_recognition_backup_*.py | head -1)
CONFIG_BACKUP=$(ls -t ${BACKUP_DIR}/config_backup_*.py | head -1)

if [ -f "$FACE_BACKUP" ] && [ -f "$CONFIG_BACKUP" ]; then
    echo "📁 Found backups:"
    echo "   Face Recognition: $FACE_BACKUP"
    echo "   Config: $CONFIG_BACKUP"
    
    # Create current version backups before rollback
    cp backend/face_recognition.py backend/face_recognition_upgraded_$(date +%Y%m%d_%H%M%S).py
    cp backend/config.py backend/config_upgraded_$(date +%Y%m%d_%H%M%S).py
    
    # Restore from backup
    cp "$FACE_BACKUP" backend/face_recognition.py
    cp "$CONFIG_BACKUP" backend/config.py
    
    # Update .env to use Facenet512
    sed -i 's/FACE_RECOGNITION_MODEL=ArcFace/FACE_RECOGNITION_MODEL=Facenet512/' .env
    sed -i 's/FACE_DISTANCE_THRESHOLD=18.0/FACE_DISTANCE_THRESHOLD=20.0/' .env
    
    echo "✅ Rollback completed successfully!"
    echo "🔧 System reverted to Facenet512 configuration"
    echo "📝 Upgraded files saved as *_upgraded_* for future reference"
else
    echo "❌ Backup files not found!"
    echo "📁 Looking in: $BACKUP_DIR"
    ls -la ${BACKUP_DIR}/*backup*.py 2>/dev/null || echo "No backup files found"
fi
