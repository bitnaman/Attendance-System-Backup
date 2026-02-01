#!/bin/bash
# ===========================================
# PRODUCTION DEPLOYMENT STRATEGY
# Zero-Downtime Update Script for Facial Attendance System
# ===========================================

set -e  # Exit on any error

# Configuration
PROJECT_NAME="facial-attendance-system"
DEPLOYMENT_USER="ubuntu"
BACKUP_RETENTION_DAYS=7
LOG_FILE="/var/log/${PROJECT_NAME}_deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_banner() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  PRODUCTION DEPLOYMENT SCRIPT"
    echo "  Facial Attendance System"
    echo "=========================================="
    echo -e "${NC}"
}

# 1. PRE-DEPLOYMENT CHECKS
pre_deployment_checks() {
    log "🔍 Starting pre-deployment checks..."
    
    # Check if we're running as the correct user
    if [ "$USER" != "$DEPLOYMENT_USER" ]; then
        echo -e "${RED}❌ Error: Run this script as $DEPLOYMENT_USER user${NC}"
        exit 1
    fi
    
    # Check disk space (minimum 1GB free)
    AVAILABLE_SPACE=$(df /home | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then  # 1GB in KB
        echo -e "${RED}❌ Error: Insufficient disk space. Need at least 1GB free${NC}"
        exit 1
    fi
    
    # Check if services are running
    if ! pgrep -f "python.*main.py" > /dev/null; then
        echo -e "${YELLOW}⚠️  Warning: Backend service not running${NC}"
    fi
    
    if ! pgrep -f "python.*http.server" > /dev/null; then
        echo -e "${YELLOW}⚠️  Warning: Frontend service not running${NC}"
    fi
    
    log "✅ Pre-deployment checks completed"
}

# 2. BACKUP CURRENT DATA
backup_data() {
    log "💾 Creating data backup..."
    
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    BACKUP_DIR="/home/$DEPLOYMENT_USER/backups/$TIMESTAMP"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if [ -f "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/attendance.db" ]; then
        cp "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/attendance.db" "$BACKUP_DIR/"
        log "✅ Database backed up to $BACKUP_DIR"
    fi
    
    # Backup uploaded files (photos, documents)
    if [ -d "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/static" ]; then
        cp -r "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/static" "$BACKUP_DIR/"
        log "✅ Static files backed up to $BACKUP_DIR"
    fi
    
    # Backup environment files
    if [ -f "/home/$DEPLOYMENT_USER/facial-attendance-system/.env" ]; then
        cp "/home/$DEPLOYMENT_USER/facial-attendance-system/.env" "$BACKUP_DIR/"
    fi
    
    if [ -f "/home/$DEPLOYMENT_USER/facial-attendance-system/frontend/.env.production" ]; then
        cp "/home/$DEPLOYMENT_USER/facial-attendance-system/frontend/.env.production" "$BACKUP_DIR/"
    fi
    
    # Create backup manifest
    echo "Backup created on: $(date)" > "$BACKUP_DIR/backup_manifest.txt"
    echo "Git commit before update: $(cd /home/$DEPLOYMENT_USER/facial-attendance-system && git rev-parse HEAD 2>/dev/null || echo 'unknown')" >> "$BACKUP_DIR/backup_manifest.txt"
    
    echo "$BACKUP_DIR" > /tmp/latest_backup_path
    log "✅ Full backup completed: $BACKUP_DIR"
}

# 3. GRACEFUL SERVICE SHUTDOWN
stop_services() {
    log "🛑 Gracefully stopping services..."
    
    # Stop backend
    if pgrep -f "python.*main.py" > /dev/null; then
        pkill -f "python.*main.py" || true
        sleep 3
        # Force kill if still running
        if pgrep -f "python.*main.py" > /dev/null; then
            pkill -9 -f "python.*main.py" || true
        fi
        log "✅ Backend service stopped"
    fi
    
    # Stop frontend
    if pgrep -f "python.*http.server" > /dev/null; then
        pkill -f "python.*http.server" || true
        sleep 2
        log "✅ Frontend service stopped"
    fi
}

# 4. UPDATE APPLICATION CODE
update_code() {
    log "📥 Updating application code..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
    
    # Store current commit for rollback
    PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    echo "$PREVIOUS_COMMIT" > /tmp/previous_commit
    
    # Stash any local changes (like .env files)
    git stash -u || true
    
    # Fetch latest changes
    git fetch origin main
    
    # Check if there are updates
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/main)
    
    if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
        log "ℹ️  No updates available. Current version is up to date."
        return 0
    fi
    
    # Pull latest changes
    git reset --hard origin/main
    
    # Restore stashed files (environment configs)
    git stash pop || true
    
    NEW_COMMIT=$(git rev-parse HEAD)
    log "✅ Code updated from $PREVIOUS_COMMIT to $NEW_COMMIT"
}

# 5. UPDATE DEPENDENCIES
update_dependencies() {
    log "📦 Updating dependencies..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
    
    # Backend dependencies
    if [ -f "backend/requirements.txt" ]; then
        cd backend
        pip install --upgrade -r requirements.txt
        cd ..
        log "✅ Backend dependencies updated"
    fi
    
    # Frontend dependencies (if package.json changed)
    if [ -f "frontend/package.json" ]; then
        cd frontend
        if [ -f "package-lock.json" ]; then
            npm ci  # Clean install for production
        else
            npm install
        fi
        npm run build  # Rebuild with latest code
        cd ..
        log "✅ Frontend dependencies updated and rebuilt"
    fi
}

# 6. RUN DATABASE MIGRATIONS
run_migrations() {
    log "🗄️  Running database migrations..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system/backend"
    
    # Run light migrations (safe, additive-only)
    python -c "
from database import engine
from migrations import run_light_migrations
try:
    run_light_migrations(engine)
    print('✅ Migrations completed successfully')
except Exception as e:
    print(f'❌ Migration error: {e}')
    exit(1)
"
    
    log "✅ Database migrations completed"
}

# 7. HEALTH CHECKS BEFORE RESTART
pre_restart_checks() {
    log "🩺 Running pre-restart health checks..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system/backend"
    
    # Check database connectivity
    python -c "
from database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT COUNT(*) FROM users')
        print(f'✅ Database connection successful. Users table has {result.fetchone()[0]} records')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"
    
    # Check required environment variables
    python -c "
import os
from pathlib import Path

required_vars = ['JWT_SECRET_KEY', 'ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES']
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    print(f'❌ Missing environment variables: {missing_vars}')
    exit(1)
else:
    print('✅ All required environment variables present')
"
    
    log "✅ Pre-restart checks passed"
}

# 8. START SERVICES
start_services() {
    log "🚀 Starting services..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
    
    # Start backend
    cd backend
    nohup python main.py > /var/log/${PROJECT_NAME}_backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to initialize
    sleep 5
    
    # Check if backend started successfully
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        log "❌ Backend failed to start"
        return 1
    fi
    
    # Start frontend
    cd frontend/build
    nohup python3 -m http.server 3000 --bind 0.0.0.0 > /var/log/${PROJECT_NAME}_frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    
    # Wait for services to stabilize
    sleep 3
    
    log "✅ Services started - Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"
}

# 9. POST-DEPLOYMENT HEALTH CHECKS
post_deployment_checks() {
    log "🩺 Running post-deployment health checks..."
    
    # Check backend health
    for i in {1..5}; do
        if curl -f -s http://localhost:8000/health >/dev/null; then
            log "✅ Backend health check passed"
            break
        elif [ $i -eq 5 ]; then
            log "❌ Backend health check failed after 5 attempts"
            return 1
        else
            log "⏳ Backend health check attempt $i/5 failed, retrying in 5 seconds..."
            sleep 5
        fi
    done
    
    # Check frontend
    if curl -f -s http://localhost:3000 >/dev/null; then
        log "✅ Frontend health check passed"
    else
        log "❌ Frontend health check failed"
        return 1
    fi
    
    log "✅ All post-deployment health checks passed"
}

# 10. CLEANUP OLD BACKUPS
cleanup_old_backups() {
    log "🧹 Cleaning up old backups..."
    
    find "/home/$DEPLOYMENT_USER/backups" -type d -name "*_*" -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    log "✅ Old backups cleaned up (kept last $BACKUP_RETENTION_DAYS days)"
}

# 11. ROLLBACK FUNCTION (call if deployment fails)
rollback() {
    log "🔄 Rolling back deployment..."
    
    if [ -f "/tmp/previous_commit" ]; then
        PREVIOUS_COMMIT=$(cat /tmp/previous_commit)
        if [ "$PREVIOUS_COMMIT" != "unknown" ]; then
            cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
            git reset --hard "$PREVIOUS_COMMIT"
            log "✅ Code rolled back to $PREVIOUS_COMMIT"
        fi
    fi
    
    if [ -f "/tmp/latest_backup_path" ]; then
        BACKUP_DIR=$(cat /tmp/latest_backup_path)
        if [ -d "$BACKUP_DIR" ]; then
            # Restore database
            if [ -f "$BACKUP_DIR/attendance.db" ]; then
                cp "$BACKUP_DIR/attendance.db" "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/"
                log "✅ Database restored from backup"
            fi
            
            # Restore static files
            if [ -d "$BACKUP_DIR/static" ]; then
                rm -rf "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/static"
                cp -r "$BACKUP_DIR/static" "/home/$DEPLOYMENT_USER/facial-attendance-system/backend/"
                log "✅ Static files restored from backup"
            fi
        fi
    fi
    
    log "🔄 Rollback completed"
}

# MAIN DEPLOYMENT FUNCTION
main() {
    print_banner
    
    # Trap errors and run rollback
    trap 'log "❌ Deployment failed. Starting rollback..."; rollback; exit 1' ERR
    
    pre_deployment_checks
    backup_data
    stop_services
    update_code
    update_dependencies
    run_migrations
    pre_restart_checks
    start_services
    post_deployment_checks
    cleanup_old_backups
    
    # Clean up temporary files
    rm -f /tmp/previous_commit /tmp/latest_backup_path
    
    echo -e "${GREEN}"
    echo "=========================================="
    echo "  🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "  Services are running and healthy"
    echo "=========================================="
    echo -e "${NC}"
    
    log "🎉 Deployment completed successfully"
}

# Script entry point
if [ "${1:-}" = "rollback" ]; then
    rollback
else
    main
fi