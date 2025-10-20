#!/bin/bash

################################################################################
# DATABASE DATA CLEANUP UTILITY - SHELL WRAPPER
#
# This script provides an easy way to clean up database records.
# Tables and schema remain intact - only data is deleted.
#
# Usage:
#   chmod +x cleanup_database.sh
#   ./cleanup_database.sh
#
# Features:
#   ✅ Interactive numbered menu
#   ✅ Confirmation required
#   ✅ Safe from accidental deletion
#   ✅ Preserves primary admin (bitnaman)
#   ✅ Keeps all tables intact
################################################################################

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        🗑️  DATABASE DATA CLEANUP UTILITY                  ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}⚠️  WARNING: This tool can PERMANENTLY delete data!${NC}"
echo -e "${YELLOW}   (Tables and schema will remain intact)${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/cleanup_data.py" ]; then
    echo -e "${RED}❌ Error: cleanup_data.py not found in backend/${NC}"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found!${NC}"
    exit 1
fi

# Run the cleanup script
cd backend
python3 cleanup_data.py

# Return to original directory
cd ..

echo ""
echo -e "${GREEN}✅ Cleanup utility closed${NC}"

