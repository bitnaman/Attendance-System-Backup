#!/bin/bash
#####################################################################
# FACIAL ATTENDANCE SYSTEM - SETUP VERIFICATION SCRIPT
# This script verifies that all components are properly installed
# and configured for the Facial Attendance System.
#
# Usage: ./verify_setup.sh
# Author: Facial Attendance System Team
# Last Updated: October 16, 2025
#####################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    FACIAL ATTENDANCE SYSTEM - SETUP VERIFICATION          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#####################################################################
# SYSTEM REQUIREMENTS CHECK
#####################################################################

echo -e "${BLUE}[1/10] Checking System Requirements...${NC}"

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "  ${GREEN}✓${NC} OS: $NAME $VERSION"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Could not detect OS"
    ((FAILED++))
fi

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
if [[ $PYTHON_VERSION == 3.10* ]]; then
    echo -e "  ${GREEN}✓${NC} Python: $PYTHON_VERSION"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Python: $PYTHON_VERSION (3.10.x recommended)"
    ((WARNINGS++))
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    echo -e "  ${GREEN}✓${NC} PostgreSQL: $PG_VERSION"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} PostgreSQL not found"
    ((FAILED++))
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VERSION"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Node.js not found"
    ((FAILED++))
fi

# Check NPM
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}✓${NC} NPM: $NPM_VERSION"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} NPM not found"
    ((FAILED++))
fi

echo ""

#####################################################################
# GPU CHECK (OPTIONAL)
#####################################################################

echo -e "${BLUE}[2/10] Checking GPU Configuration (Optional)...${NC}"

if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} GPU Detected: $GPU_INFO"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠${NC} NVIDIA drivers installed but GPU not accessible"
        ((WARNINGS++))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} No NVIDIA GPU detected (CPU mode will be used)"
    ((WARNINGS++))
fi

echo ""

#####################################################################
# DIRECTORY STRUCTURE CHECK
#####################################################################

echo -e "${BLUE}[3/10] Checking Project Structure...${NC}"

REQUIRED_DIRS=(
    "backend"
    "backend/static"
    "backend/static/uploads"
    "backend/static/dataset"
    "backend/static/attendance_photos"
    "backend/static/student_photos"
    "backend/static/exports"
    "frontend"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ${GREEN}✓${NC} Directory exists: $dir"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} Missing directory: $dir"
        ((FAILED++))
    fi
done

echo ""

#####################################################################
# CONFIGURATION FILE CHECK
#####################################################################

echo -e "${BLUE}[4/10] Checking Configuration Files...${NC}"

if [ -f "backend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} Configuration file found: backend/.env"
    ((PASSED++))
    
    # Check critical environment variables
    if grep -q "POSTGRES_DB" backend/.env; then
        DB_NAME=$(grep "POSTGRES_DB" backend/.env | cut -d'=' -f2)
        echo -e "  ${GREEN}✓${NC} Database configured: $DB_NAME"
        ((PASSED++))
    fi
    
    if grep -q "FACE_RECOGNITION_MODEL" backend/.env; then
        MODEL=$(grep "FACE_RECOGNITION_MODEL" backend/.env | cut -d'=' -f2)
        echo -e "  ${GREEN}✓${NC} Face recognition model: $MODEL"
        ((PASSED++))
    fi
else
    echo -e "  ${RED}✗${NC} Configuration file not found: backend/.env"
    ((FAILED++))
fi

echo ""

#####################################################################
# PYTHON DEPENDENCIES CHECK
#####################################################################

echo -e "${BLUE}[5/10] Checking Python Dependencies...${NC}"

cd backend 2>/dev/null

# Check virtual environment
if [ -d "../venv" ]; then
    echo -e "  ${GREEN}✓${NC} Virtual environment found"
    ((PASSED++))
    source ../venv/bin/activate 2>/dev/null
else
    echo -e "  ${YELLOW}⚠${NC} Virtual environment not found (optional)"
    ((WARNINGS++))
fi

# Check critical Python packages
PACKAGES=("fastapi" "uvicorn" "sqlalchemy" "psycopg2" "tensorflow" "torch" "deepface" "opencv-python")

for package in "${PACKAGES[@]}"; do
    if python3 -c "import importlib.util; exit(0 if importlib.util.find_spec('${package}') else 1)" 2>/dev/null; then
        VERSION=$(python3 -c "import ${package}; print(${package}.__version__)" 2>/dev/null || echo "installed")
        echo -e "  ${GREEN}✓${NC} $package: $VERSION"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} $package not installed"
        ((FAILED++))
    fi
done

cd .. 2>/dev/null

echo ""

#####################################################################
# DATABASE CONNECTION CHECK
#####################################################################

echo -e "${BLUE}[6/10] Checking Database Connection...${NC}"

if [ -f "backend/.env" ]; then
    # Extract database credentials
    DB_USER=$(grep "POSTGRES_USER" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_PASS=$(grep "POSTGRES_PASSWORD" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_NAME=$(grep "POSTGRES_DB" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DB_HOST=$(grep "POSTGRES_HOST" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    # Test connection with Python
    cd backend
    if python3 -c "import psycopg2; psycopg2.connect(host='$DB_HOST', database='$DB_NAME', user='$DB_USER', password='$DB_PASS')" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Database connection successful"
        echo -e "    Host: $DB_HOST"
        echo -e "    Database: $DB_NAME"
        echo -e "    User: $DB_USER"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} Cannot connect to database"
        echo -e "    Host: $DB_HOST"
        echo -e "    Database: $DB_NAME"
        echo -e "    User: $DB_USER"
        ((FAILED++))
    fi
    cd ..
else
    echo -e "  ${RED}✗${NC} Cannot check database (no .env file)"
    ((FAILED++))
fi

echo ""

#####################################################################
# DATABASE SCHEMA CHECK
#####################################################################

echo -e "${BLUE}[7/10] Checking Database Schema...${NC}"

if [ -f "backend/.env" ]; then
    cd backend
    TABLES=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "\dt" 2>/dev/null | grep -c "table")
    
    if [ $TABLES -ge 4 ]; then
        echo -e "  ${GREEN}✓${NC} Database tables created ($TABLES tables found)"
        
        # Check for specific tables
        for table in "classes" "students" "attendance_sessions" "attendance_records"; do
            if PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "\dt" 2>/dev/null | grep -q "$table"; then
                echo -e "  ${GREEN}✓${NC} Table exists: $table"
                ((PASSED++))
            else
                echo -e "  ${RED}✗${NC} Table missing: $table"
                ((FAILED++))
            fi
        done
    else
        echo -e "  ${YELLOW}⚠${NC} Database initialized but tables not created (run database initialization)"
        ((WARNINGS++))
    fi
    cd ..
else
    echo -e "  ${RED}✗${NC} Cannot check schema (no database connection)"
    ((FAILED++))
fi

echo ""

#####################################################################
# FACE RECOGNITION MODELS CHECK
#####################################################################

echo -e "${BLUE}[8/10] Checking Face Recognition Models...${NC}"

cd backend
if python3 -c "from deepface import DeepFace; print('OK')" 2>/dev/null | grep -q "OK"; then
    echo -e "  ${GREEN}✓${NC} DeepFace library loaded successfully"
    ((PASSED++))
    
    # Test model loading
    if python3 -c "from deepface import DeepFace; DeepFace.build_model('ArcFace')" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} ArcFace model loaded"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠${NC} ArcFace model not cached (will download on first use)"
        ((WARNINGS++))
    fi
else
    echo -e "  ${RED}✗${NC} DeepFace library not working"
    ((FAILED++))
fi
cd ..

echo ""

#####################################################################
# FRONTEND DEPENDENCIES CHECK
#####################################################################

echo -e "${BLUE}[9/10] Checking Frontend Dependencies...${NC}"

if [ -f "frontend/package.json" ]; then
    echo -e "  ${GREEN}✓${NC} package.json found"
    ((PASSED++))
    
    if [ -d "frontend/node_modules" ]; then
        echo -e "  ${GREEN}✓${NC} Node modules installed"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠${NC} Node modules not installed (run 'npm install' in frontend/)"
        ((WARNINGS++))
    fi
else
    echo -e "  ${RED}✗${NC} package.json not found"
    ((FAILED++))
fi

echo ""

#####################################################################
# PORT AVAILABILITY CHECK
#####################################################################

echo -e "${BLUE}[10/10] Checking Port Availability...${NC}"

# Check port 8000 (Backend)
if ! lsof -i :8000 &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Port 8000 available (Backend)"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Port 8000 in use (Backend may already be running)"
    ((WARNINGS++))
fi

# Check port 3000 (Frontend)
if ! lsof -i :3000 &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Port 3000 available (Frontend)"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Port 3000 in use (Frontend may already be running)"
    ((WARNINGS++))
fi

echo ""

#####################################################################
# SUMMARY
#####################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    VERIFICATION SUMMARY                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✓ Passed:${NC}   $PASSED checks"
echo -e "  ${RED}✗ Failed:${NC}   $FAILED checks"
echo -e "  ${YELLOW}⚠ Warnings:${NC} $WARNINGS checks"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ SYSTEM READY! All critical checks passed.              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Start backend:  cd backend && python3 main.py"
    echo -e "  2. Start frontend: cd frontend && npm start"
    echo -e "  3. Access system:  http://localhost:3000"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SETUP INCOMPLETE! Please fix the failed checks above.  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Common solutions:${NC}"
    echo -e "  • Install missing dependencies: cd backend && pip install -r requirements.txt"
    echo -e "  • Initialize database: cd backend && python3 -c 'from database import init_fresh_db; init_fresh_db()'"
    echo -e "  • Create directories: mkdir -p backend/static/{uploads,dataset,attendance_photos,student_photos,exports}"
    echo -e "  • Install Node modules: cd frontend && npm install"
    echo ""
    exit 1
fi
