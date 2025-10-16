#!/bin/bash
#####################################################################
# DATABASE INITIALIZATION SCRIPT
# Facial Attendance System
#
# This script helps initialize the PostgreSQL database for first-time
# setup or to reset the database to a fresh state.
#
# Usage: ./initialize_database.sh [--fresh|--preserve]
#   --fresh    : Drop all existing data and create fresh database
#   --preserve : Only create missing tables (preserves existing data)
#
# Author: Facial Attendance System Team
# Last Updated: October 16, 2025
#####################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default mode
MODE="fresh"

# Parse arguments
if [ "$1" == "--preserve" ]; then
    MODE="preserve"
elif [ "$1" == "--fresh" ]; then
    MODE="fresh"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        DATABASE INITIALIZATION SCRIPT                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#####################################################################
# CHECK PREREQUISITES
#####################################################################

echo -e "${BLUE}[1/4] Checking prerequisites...${NC}"

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}✗ Error: backend/.env file not found${NC}"
    echo -e "${YELLOW}  Please create .env file with database credentials${NC}"
    exit 1
fi

# Extract database credentials
DB_USER=$(grep "POSTGRES_USER" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
DB_PASS=$(grep "POSTGRES_PASSWORD" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
DB_NAME=$(grep "POSTGRES_DB" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
DB_HOST=$(grep "POSTGRES_HOST" backend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

echo -e "${GREEN}✓ Configuration loaded${NC}"
echo -e "  Database: $DB_NAME"
echo -e "  User: $DB_USER"
echo -e "  Host: $DB_HOST"
echo ""

#####################################################################
# CHECK DATABASE CONNECTION
#####################################################################

echo -e "${BLUE}[2/4] Testing database connection...${NC}"

cd backend
if python3 -c "import psycopg2; psycopg2.connect(host='$DB_HOST', database='$DB_NAME', user='$DB_USER', password='$DB_PASS')" 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo -e "1. Check if PostgreSQL is running:"
    echo -e "   ${BLUE}sudo systemctl status postgresql${NC}"
    echo ""
    echo -e "2. Verify database exists:"
    echo -e "   ${BLUE}sudo -u postgres psql -l | grep $DB_NAME${NC}"
    echo ""
    echo -e "3. If database doesn't exist, create it:"
    echo -e "   ${BLUE}sudo -u postgres psql${NC}"
    echo -e "   ${BLUE}CREATE DATABASE $DB_NAME;${NC}"
    echo -e "   ${BLUE}CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';${NC}"
    echo -e "   ${BLUE}GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;${NC}"
    echo -e "   ${BLUE}\q${NC}"
    echo ""
    exit 1
fi
cd ..
echo ""

#####################################################################
# INITIALIZE DATABASE
#####################################################################

echo -e "${BLUE}[3/4] Initializing database schema...${NC}"

if [ "$MODE" == "fresh" ]; then
    echo -e "${YELLOW}⚠ WARNING: This will DELETE all existing data!${NC}"
    echo -e "${YELLOW}  Mode: FRESH INITIALIZATION${NC}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}✗ Initialization cancelled${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${BLUE}Running fresh database initialization...${NC}"
    
    cd backend
    python3 -c "from database import init_fresh_db; init_fresh_db()" 2>&1
    EXIT_CODE=$?
    cd ..
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Fresh database initialized successfully${NC}"
    else
        echo -e "${RED}✗ Database initialization failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}  Mode: PRESERVE EXISTING DATA${NC}"
    echo ""
    echo -e "${BLUE}Creating missing tables (if any)...${NC}"
    
    cd backend
    python3 -c "from database import create_all_tables; create_all_tables()" 2>&1
    EXIT_CODE=$?
    cd ..
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Database tables verified/created${NC}"
    else
        echo -e "${RED}✗ Table creation failed${NC}"
        exit 1
    fi
fi

echo ""

#####################################################################
# VERIFY SCHEMA
#####################################################################

echo -e "${BLUE}[4/4] Verifying database schema...${NC}"

cd backend

# Check tables
TABLES=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "\dt" 2>/dev/null | grep -c "table")

if [ $TABLES -ge 4 ]; then
    echo -e "${GREEN}✓ Database schema verified ($TABLES tables)${NC}"
    
    # List tables
    echo ""
    echo -e "${BLUE}Tables created:${NC}"
    PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "\dt" 2>/dev/null | grep "public"
    
    # Count records
    echo ""
    echo -e "${BLUE}Current data:${NC}"
    
    CLASS_COUNT=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "SELECT COUNT(*) FROM classes;" 2>/dev/null | tr -d ' ')
    STUDENT_COUNT=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "SELECT COUNT(*) FROM students;" 2>/dev/null | tr -d ' ')
    SESSION_COUNT=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "SELECT COUNT(*) FROM attendance_sessions;" 2>/dev/null | tr -d ' ')
    RECORD_COUNT=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -d $DB_NAME -h $DB_HOST -t -c "SELECT COUNT(*) FROM attendance_records;" 2>/dev/null | tr -d ' ')
    
    echo -e "  Classes:             $CLASS_COUNT"
    echo -e "  Students:            $STUDENT_COUNT"
    echo -e "  Attendance Sessions: $SESSION_COUNT"
    echo -e "  Attendance Records:  $RECORD_COUNT"
else
    echo -e "${RED}✗ Schema verification failed${NC}"
    exit 1
fi

cd ..

echo ""

#####################################################################
# SUCCESS SUMMARY
#####################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ DATABASE INITIALIZATION COMPLETE!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""

if [ "$CLASS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Sample classes are already created"
    echo -e "  View classes: ${BLUE}psql -U $DB_USER -d $DB_NAME -c 'SELECT * FROM classes;'${NC}"
else
    echo -e "${YELLOW}⚠${NC} No classes found. You can:"
    echo -e "  • Add classes via the web interface"
    echo -e "  • Or run: ${BLUE}cd backend && python3 -c 'from database import SessionLocal, create_sample_classes; db=SessionLocal(); create_sample_classes(db); db.close()'${NC}"
fi

echo ""
echo -e "${BLUE}Start the application:${NC}"
echo -e "  1. Backend:  ${BLUE}cd backend && python3 main.py${NC}"
echo -e "  2. Frontend: ${BLUE}cd frontend && npm start${NC}"
echo ""
echo -e "${BLUE}Access the system:${NC}"
echo -e "  • Frontend:  http://localhost:3000"
echo -e "  • Backend:   http://localhost:8000"
echo -e "  • API Docs:  http://localhost:8000/docs"
echo ""
echo -e "${GREEN}Database is ready for use!${NC}"
echo ""
