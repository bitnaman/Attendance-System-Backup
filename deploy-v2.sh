#!/bin/bash
# ===========================================
# PRODUCTION DEPLOYMENT SCRIPT v2.0
# Systemd-based service management
# ===========================================

set -e  # Exit on any error

# Configuration
PROJECT_NAME="facial-attendance-system"
DEPLOYMENT_USER="ubuntu"
BACKUP_RETENTION_DAYS=7
LOG_FILE="/var/log/${PROJECT_NAME}_deployment.log"
USE_SYSTEMD=true

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
    echo "  PRODUCTION DEPLOYMENT SCRIPT v2.0"
    echo "  Facial Attendance System"
    echo "  Systemd Service Management"
    echo "=========================================="
    echo -e "${NC}"
}

# Check if running as correct user
check_user() {
    if [ "$USER" != "$DEPLOYMENT_USER" ]; then
        echo -e "${RED}❌ Error: Run this script as $DEPLOYMENT_USER user${NC}"
        exit 1
    fi
}

# Setup systemd services if not already done
setup_systemd_services() {
    if [ "$USE_SYSTEMD" = true ]; then
        log "🔧 Setting up systemd services..."
        
        # Check if services already exist
        if ! systemctl --user is-enabled facial-attendance-backend &>/dev/null; then
            log "📝 Creating systemd service files..."
            
            # Create user service directory
            mkdir -p ~/.config/systemd/user
            
            # Backend service
            cat > ~/.config/systemd/user/facial-attendance-backend.service << 'EOF'
[Unit]
Description=Facial Attendance System Backend API
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/facial-attendance-system/backend
Environment=PATH=/usr/bin:/usr/local/bin
Environment=PYTHONPATH=%h/facial-attendance-system/backend
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=5
StandardOutput=append:/var/log/facial-attendance-system_backend.log
StandardError=append:/var/log/facial-attendance-system_backend.log

[Install]
WantedBy=default.target
EOF

            # Frontend service
            cat > ~/.config/systemd/user/facial-attendance-frontend.service << 'EOF'
[Unit]
Description=Facial Attendance System Frontend
After=facial-attendance-backend.service
Requires=facial-attendance-backend.service

[Service]
Type=simple
WorkingDirectory=%h/facial-attendance-system/frontend/build
ExecStart=/usr/bin/python3 -m http.server 3000 --bind 0.0.0.0
Restart=always
RestartSec=3
StandardOutput=append:/var/log/facial-attendance-system_frontend.log
StandardError=append:/var/log/facial-attendance-system_frontend.log

[Install]
WantedBy=default.target
EOF

            # Reload and enable services
            systemctl --user daemon-reload
            systemctl --user enable facial-attendance-backend.service
            systemctl --user enable facial-attendance-frontend.service
            
            log "✅ Systemd services created and enabled"
        else
            log "ℹ️  Systemd services already configured"
        fi
    fi
}

# Stop services (systemd or manual)
stop_services() {
    log "🛑 Stopping services..."
    
    if [ "$USE_SYSTEMD" = true ]; then
        # Stop systemd services
        systemctl --user stop facial-attendance-frontend.service 2>/dev/null || true
        systemctl --user stop facial-attendance-backend.service 2>/dev/null || true
        log "✅ Systemd services stopped"
    else
        # Stop manual processes
        if pgrep -f "python.*main.py" > /dev/null; then
            pkill -f "python.*main.py" || true
            sleep 3
            if pgrep -f "python.*main.py" > /dev/null; then
                pkill -9 -f "python.*main.py" || true
            fi
        fi
        
        if pgrep -f "python.*http.server" > /dev/null; then
            pkill -f "python.*http.server" || true
            sleep 2
        fi
        log "✅ Manual processes stopped"
    fi
}

# Start services (systemd or manual)
start_services() {
    log "🚀 Starting services..."
    
    if [ "$USE_SYSTEMD" = true ]; then
        # Start systemd services
        systemctl --user start facial-attendance-backend.service
        sleep 5
        
        # Check if backend started successfully
        if systemctl --user is-active facial-attendance-backend.service --quiet; then
            log "✅ Backend service started successfully"
        else
            log "❌ Backend service failed to start"
            systemctl --user status facial-attendance-backend.service
            return 1
        fi
        
        systemctl --user start facial-attendance-frontend.service
        sleep 3
        
        # Check if frontend started successfully
        if systemctl --user is-active facial-attendance-frontend.service --quiet; then
            log "✅ Frontend service started successfully"
        else
            log "❌ Frontend service failed to start"
            systemctl --user status facial-attendance-frontend.service
            return 1
        fi
    else
        # Start manual processes
        cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
        
        cd backend
        nohup python main.py > /var/log/${PROJECT_NAME}_backend.log 2>&1 &
        BACKEND_PID=$!
        cd ..
        
        sleep 5
        
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            log "❌ Backend failed to start"
            return 1
        fi
        
        cd frontend/build
        nohup python3 -m http.server 3000 --bind 0.0.0.0 > /var/log/${PROJECT_NAME}_frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ../..
        
        sleep 3
        log "✅ Manual services started - Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"
    fi
}

# Service status check
check_service_status() {
    log "🔍 Checking service status..."
    
    if [ "$USE_SYSTEMD" = true ]; then
        # Check systemd services
        BACKEND_STATUS=$(systemctl --user is-active facial-attendance-backend.service 2>/dev/null || echo "inactive")
        FRONTEND_STATUS=$(systemctl --user is-active facial-attendance-frontend.service 2>/dev/null || echo "inactive")
        
        log "Backend service: $BACKEND_STATUS"
        log "Frontend service: $FRONTEND_STATUS"
        
        if [ "$BACKEND_STATUS" = "active" ] && [ "$FRONTEND_STATUS" = "active" ]; then
            return 0
        else
            return 1
        fi
    else
        # Check manual processes
        if pgrep -f "python.*main.py" > /dev/null && pgrep -f "python.*http.server" > /dev/null; then
            log "✅ Manual services running"
            return 0
        else
            log "❌ Some manual services not running"
            return 1
        fi
    fi
}

# Enhanced pre-deployment checks
pre_deployment_checks() {
    log "🔍 Starting pre-deployment checks..."
    
    check_user
    
    # Check disk space (minimum 1GB free)
    AVAILABLE_SPACE=$(df /home | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then  # 1GB in KB
        echo -e "${RED}❌ Error: Insufficient disk space. Need at least 1GB free${NC}"
        exit 1
    fi
    
    # Check if git repository exists
    if [ ! -d "/home/$DEPLOYMENT_USER/facial-attendance-system/.git" ]; then
        echo -e "${RED}❌ Error: Git repository not found at /home/$DEPLOYMENT_USER/facial-attendance-system${NC}"
        exit 1
    fi
    
    # Check Python and required commands
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Error: python3 not found${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}⚠️  Warning: npm not found. Frontend builds may fail${NC}"
    fi
    
    log "✅ Pre-deployment checks completed"
}

# Backup current data with metadata
backup_data() {
    log "💾 Creating comprehensive backup..."
    
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    BACKUP_DIR="/home/$DEPLOYMENT_USER/backups/$TIMESTAMP"
    
    mkdir -p "$BACKUP_DIR"
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
    
    # Get current commit info
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    # Backup database
    if [ -f "backend/attendance.db" ]; then
        cp "backend/attendance.db" "$BACKUP_DIR/"
        DB_SIZE=$(stat -c%s "backend/attendance.db" 2>/dev/null || echo "unknown")
        log "✅ Database backed up (size: $DB_SIZE bytes)"
    fi
    
    # Backup static files
    if [ -d "backend/static" ]; then
        cp -r "backend/static" "$BACKUP_DIR/"
        STATIC_SIZE=$(du -sh "backend/static" | cut -f1)
        log "✅ Static files backed up (size: $STATIC_SIZE)"
    fi
    
    # Backup environment files
    [ -f ".env" ] && cp ".env" "$BACKUP_DIR/"
    [ -f "frontend/.env.production" ] && cp "frontend/.env.production" "$BACKUP_DIR/"
    
    # Create comprehensive backup manifest
    cat > "$BACKUP_DIR/backup_manifest.txt" << EOF
Backup Metadata
===============
Created: $(date)
Git Commit: $CURRENT_COMMIT
Git Branch: $CURRENT_BRANCH
Database Size: $DB_SIZE bytes
Static Files Size: $STATIC_SIZE
Systemd Enabled: $USE_SYSTEMD
Python Version: $(python3 --version 2>/dev/null || echo "unknown")
System: $(uname -a)
Disk Space: $(df -h /home | awk 'NR==2 {print $4}') available
EOF
    
    echo "$BACKUP_DIR" > /tmp/latest_backup_path
    log "✅ Comprehensive backup completed: $BACKUP_DIR"
}

# Git update with stash management
update_code() {
    log "📥 Updating application code..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
    
    # Store current commit for rollback
    PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    echo "$PREVIOUS_COMMIT" > /tmp/previous_commit
    
    # Stash any local changes (like .env files)
    git stash push -m "Pre-deployment stash $(date)" --include-untracked || true
    
    # Fetch latest changes
    git fetch origin main
    
    # Check if there are updates
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/main)
    
    if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
        log "ℹ️  No updates available. Current version is up to date."
        return 0
    fi
    
    log "📦 Updating from $LOCAL_COMMIT to $REMOTE_COMMIT"
    
    # Pull latest changes
    git reset --hard origin/main
    
    # Restore stashed files (environment configs)
    git stash pop || true
    
    NEW_COMMIT=$(git rev-parse HEAD)
    log "✅ Code updated to $NEW_COMMIT"
}

# Enhanced dependency management
update_dependencies() {
    log "📦 Updating dependencies..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
    
    # Backend dependencies
    if [ -f "backend/requirements.txt" ]; then
        cd backend
        
        # Check if requirements changed
        if [ -f "/tmp/old_requirements.txt" ] && cmp -s "requirements.txt" "/tmp/old_requirements.txt"; then
            log "ℹ️  Backend requirements unchanged, skipping pip install"
        else
            cp "requirements.txt" "/tmp/old_requirements.txt"
            pip install --upgrade -r requirements.txt
            log "✅ Backend dependencies updated"
        fi
        cd ..
    fi
    
    # Frontend dependencies and build
    if [ -f "frontend/package.json" ]; then
        cd frontend
        
        # Check if package.json changed
        if [ -f "/tmp/old_package.json" ] && cmp -s "package.json" "/tmp/old_package.json"; then
            log "ℹ️  Frontend package.json unchanged"
        else
            cp "package.json" "/tmp/old_package.json"
            if [ -f "package-lock.json" ]; then
                npm ci  # Clean install for production
            else
                npm install
            fi
            log "✅ Frontend dependencies updated"
        fi
        
        # Always rebuild frontend for code changes
        npm run build
        log "✅ Frontend rebuilt"
        cd ..
    fi
}

# Database migrations with safety checks
run_migrations() {
    log "🗄️  Running database migrations..."
    
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system/backend"
    
    # Create backup before migration
    if [ -f "attendance.db" ]; then
        cp "attendance.db" "attendance.db.pre-migration.$(date +%s)"
    fi
    
    # Run migrations with error handling
    python -c "
from database import engine
from migrations import run_light_migrations
import sys

try:
    print('Starting database migrations...')
    run_light_migrations(engine)
    print('✅ Migrations completed successfully')
except Exception as e:
    print(f'❌ Migration error: {e}')
    sys.exit(1)
" || {
        log "❌ Database migration failed"
        return 1
    }
    
    log "✅ Database migrations completed"
}

# Comprehensive health checks
health_checks() {
    log "🩺 Running comprehensive health checks..."
    
    # Wait for services to stabilize
    sleep 5
    
    # Check backend health endpoint
    for i in {1..10}; do
        if curl -f -s http://localhost:8000/health >/dev/null; then
            log "✅ Backend health check passed"
            break
        elif [ $i -eq 10 ]; then
            log "❌ Backend health check failed after 10 attempts"
            return 1
        else
            log "⏳ Backend health check attempt $i/10 failed, retrying in 3 seconds..."
            sleep 3
        fi
    done
    
    # Check frontend
    if curl -f -s http://localhost:3000 >/dev/null; then
        log "✅ Frontend health check passed"
    else
        log "❌ Frontend health check failed"
        return 1
    fi
    
    # Check database
    cd "/home/$DEPLOYMENT_USER/facial-attendance-system/backend"
    python -c "
from database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT COUNT(*) FROM users')
        count = result.fetchone()[0]
        print(f'✅ Database health check passed ({count} users)')
except Exception as e:
    print(f'❌ Database health check failed: {e}')
    exit(1)
" || return 1
    
    log "✅ All health checks passed"
}

# Enhanced rollback with service management
rollback() {
    log "🔄 Rolling back deployment..."
    
    # Stop current services
    stop_services
    
    # Restore code
    if [ -f "/tmp/previous_commit" ]; then
        PREVIOUS_COMMIT=$(cat /tmp/previous_commit)
        if [ "$PREVIOUS_COMMIT" != "unknown" ]; then
            cd "/home/$DEPLOYMENT_USER/facial-attendance-system"
            git reset --hard "$PREVIOUS_COMMIT"
            log "✅ Code rolled back to $PREVIOUS_COMMIT"
        fi
    fi
    
    # Restore data from backup
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
    
    # Restart services
    start_services
    
    log "🔄 Rollback completed"
}

# Main deployment function
main() {
    print_banner
    
    # Trap errors and run rollback
    trap 'log "❌ Deployment failed. Starting rollback..."; rollback; exit 1' ERR
    
    setup_systemd_services
    pre_deployment_checks
    backup_data
    stop_services
    update_code
    update_dependencies
    run_migrations
    start_services
    health_checks
    
    # Clean up temporary files
    rm -f /tmp/previous_commit /tmp/latest_backup_path /tmp/old_requirements.txt /tmp/old_package.json
    
    echo -e "${GREEN}"
    echo "=========================================="
    echo "  🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "  "
    if [ "$USE_SYSTEMD" = true ]; then
        echo "  Systemd Services:"
        echo "  - Backend:  systemctl --user status facial-attendance-backend.service"
        echo "  - Frontend: systemctl --user status facial-attendance-frontend.service"
    else
        echo "  Manual Services Running"
    fi
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend:  http://localhost:8000"
    echo "  - Health:   http://localhost:8000/health"
    echo "=========================================="
    echo -e "${NC}"
    
    log "🎉 Deployment completed successfully"
}

# Script entry point with enhanced options
case "${1:-}" in
    "rollback")
        rollback
        ;;
    "systemd")
        USE_SYSTEMD=true
        main
        ;;
    "manual")
        USE_SYSTEMD=false
        main
        ;;
    "status")
        check_service_status
        ;;
    "stop")
        setup_systemd_services
        stop_services
        ;;
    "start")
        setup_systemd_services
        start_services
        ;;
    "restart")
        setup_systemd_services
        stop_services
        start_services
        ;;
    *)
        main
        ;;
esac