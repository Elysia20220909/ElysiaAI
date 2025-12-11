#!/usr/bin/env bash
# JSONL Rotation Script (Linux/macOS/WSL)

DATA_DIR="${1:-data}"
MAX_SIZE_MB="${2:-50}"

get_size_mb() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo "0"
        return
    fi
    local bytes=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    echo $((bytes / 1024 / 1024))
}

if [ ! -d "$DATA_DIR" ]; then
    echo "Data directory not found: $DATA_DIR"
    exit 0
fi

for file in "$DATA_DIR"/*.jsonl; do
    [ -e "$file" ] || continue
    size=$(get_size_mb "$file")
    if [ "$size" -ge "$MAX_SIZE_MB" ]; then
        ts=$(date +%Y%m%d%H%M%S)
        archive="${file}.${ts}"
        echo "Rotating $(basename "$file") (${size} MB) -> $archive"
        mv -f "$file" "$archive"
        touch "$file"
    fi
done

echo "Rotation complete"
