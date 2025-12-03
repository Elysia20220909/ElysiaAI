#!/bin/bash
# Clean build artifacts and temporary files

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Elysia AI Project Cleanup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

DEEP_CLEAN=false
WHATIF=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --deep)
            DEEP_CLEAN=true
            shift
            ;;
        --whatif)
            WHATIF=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

total_size=0
items_removed=0

cleanup_item() {
    local path=$1
    local description=$2
    
    echo -n "Checking: $description..."
    
    if [ -e "$path" ] || [ -d "$path" ]; then
        size=$(du -sb "$path" 2>/dev/null | cut -f1 || echo "0")
        size_mb=$(echo "scale=2; $size / 1048576" | bc)
        
        if [ "$WHATIF" = false ]; then
            rm -rf "$path" 2>/dev/null || true
        fi
        
        echo -e " ${GREEN}✓ Removed ($size_mb MB)${NC}"
        total_size=$((total_size + size))
        items_removed=$((items_removed + 1))
    else
        echo -e " ${GRAY}- Not found${NC}"
    fi
}

# Basic cleanup
cleanup_item "dist" "Build output"
cleanup_item ".tsbuildinfo" "TypeScript build cache"
cleanup_item "dist.zip" "Distribution archive"

# Log files
for log in *.log; do
    [ -f "$log" ] && cleanup_item "$log" "Log file: $log"
done

# Temporary files
for tmp in *.tmp *.cache; do
    [ -f "$tmp" ] && cleanup_item "$tmp" "Temporary file: $tmp"
done

if [ "$DEEP_CLEAN" = true ]; then
    echo -e "${YELLOW}🔥 Deep clean mode enabled${NC}"
    cleanup_item "node_modules" "Dependencies"
    cleanup_item "bun.lock" "Lock file"
    cleanup_item "logs" "Log directory"
fi

echo ""
echo -e "${BLUE}================================${NC}"
if [ "$WHATIF" = true ]; then
    echo -e "${YELLOW}🔍 What-If mode: No files were actually deleted${NC}"
fi
echo -e "${GREEN}✨ Cleanup complete!${NC}"
echo -e "${BLUE}Items removed: $items_removed${NC}"
total_mb=$(echo "scale=2; $total_size / 1048576" | bc)
echo -e "${BLUE}Space freed: $total_mb MB${NC}"

if [ "$DEEP_CLEAN" = true ]; then
    echo ""
    echo -e "${YELLOW}💡 Run 'bun install' to reinstall dependencies${NC}"
fi

echo ""
