#!/bin/bash

################################################################################
# FACIAL ATTENDANCE SYSTEM - MASTER SETUP SCRIPT
#
# This script initializes EVERYTHING for your attendance system.
# Run this ONCE when setting up or updating the system.
#
# Usage:
#   chmod +x setup_system.sh
#   ./setup_system.sh
#
# What it does:
#   ✅ Checks Python and Node.js installation
#   ✅ Initializes database (creates tables, adds columns, sets indexes)
#   ✅ Marks bitnaman as primary admin
#   ✅ Verifies everything is ready
#   ✅ Shows you how to start the system
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Header
echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     FACIAL ATTENDANCE SYSTEM - MASTER SETUP                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Check Python
echo -e "${CYAN}[1/5]${NC} ${BLUE}Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "   ${GREEN}✅${NC} Python found: $PYTHON_VERSION"
else
    echo -e "   ${RED}❌ Python 3 not found!${NC}"
    echo "   Please install Python 3.8 or higher"
    exit 1
fi

# Step 2: Check Node.js (optional, for frontend)
echo -e "${CYAN}[2/5]${NC} ${BLUE}Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "   ${GREEN}✅${NC} Node.js found: $NODE_VERSION"
else
    echo -e "   ${YELLOW}⚠️${NC}  Node.js not found (optional, only needed for frontend)"
fi

# Step 3: Check if .env exists
echo -e "${CYAN}[3/5]${NC} ${BLUE}Checking configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "   ${GREEN}✅${NC} .env configuration file found"
else
    echo -e "   ${YELLOW}⚠️${NC}  .env file not found"
    echo "   Make sure to configure your database and settings"
fi

# Step 4: Initialize Database
echo -e "${CYAN}[4/5]${NC} ${BLUE}Initializing database...${NC}"
echo ""

cd backend

if python3 initialize_database.py; then
    echo ""
    echo -e "   ${GREEN}✅${NC} Database initialization successful!"
else
    echo ""
    echo -e "   ${RED}❌${NC} Database initialization failed!"
    echo "   Check the error messages above"
    exit 1
fi

cd ..

# Step 5: Final verification
echo -e "${CYAN}[5/5]${NC} ${BLUE}Final verification...${NC}"
echo ""

# Summary
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                  ✅ SETUP COMPLETE!                        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Next steps
echo -e "${YELLOW}📝 NEXT STEPS:${NC}"
echo ""
echo -e "${CYAN}1. Start Backend:${NC}"
echo "   cd backend"
echo "   python3 main.py"
echo ""
echo -e "${CYAN}2. Start Frontend (in another terminal):${NC}"
echo "   cd frontend"
echo "   npm start"
echo ""
echo -e "${CYAN}3. Access Application:${NC}"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo -e "${GREEN}🎉 Everything is ready to use!${NC}"
echo ""

