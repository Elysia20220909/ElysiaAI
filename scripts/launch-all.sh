#!/bin/bash
# Elysia AI - All Platforms Development Launcher (Linux/macOS)

set -e

echo "🌸 Elysia AI - All Platforms Launcher 🌸"
echo ""

# 1. Check prerequisites
echo "📋 Checking prerequisites..."

check_command() {
    if command -v $1 &> /dev/null; then
        version=$($1 --version 2>&1 | head -n1)
        echo "  ✓ $1 : $version"
    else
        echo "  ✗ $1 : Not found"
    fi
}

check_command node
check_command bun
check_command python3
check_command rustc

echo ""

# 2. Start backend services
echo "🚀 Starting backend services..."

echo "  Starting FastAPI (Python)..."
cd python && python3 fastapi_server.py > ../logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
cd ..

sleep 2

echo "  Starting Elysia Server (Bun)..."
bun run dev > logs/elysia.log 2>&1 &
ELYSIA_PID=$!

sleep 3

# 3. Health check
echo "🏥 Health checking services..."

check_endpoint() {
    if curl -s -f "$1" > /dev/null; then
        echo "  ✓ $2 : OK"
    else
        echo "  ⚠ $2 : Not ready yet"
    fi
}

check_endpoint "http://localhost:8000/health" "FastAPI"
check_endpoint "http://localhost:3000/ping" "Elysia"

echo ""

# 4. Launch platforms
echo "💻 Available platforms:"
echo "  1. Web Demo"
echo "  2. Desktop (Electron)"
echo "  3. Desktop (Tauri)"
echo "  4. Mobile (Expo)"
echo "  5. All Web Pages"
echo "  0. Skip platform launch"
echo ""

read -p "Select platform to launch (1-5, 0 to skip): " choice

case $choice in
    1)
        echo "  Opening Web Demo..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://localhost:3000/demo-airi.html"
        else
            xdg-open "http://localhost:3000/demo-airi.html" 2>/dev/null || echo "Please open http://localhost:3000/demo-airi.html manually"
        fi
        ;;
    2)
        echo "  Launching Electron Desktop..."
        cd desktop && npm start &
        cd ..
        ;;
    3)
        echo "  Launching Tauri Desktop..."
        if [ -d "tauri-app" ]; then
            cd tauri-app && npm run dev &
            cd ..
        else
            echo "  ⚠ Tauri app not found. Run setup first."
        fi
        ;;
    4)
        echo "  Launching Expo Mobile..."
        cd mobile && npm start &
        cd ..
        ;;
    5)
        echo "  Opening all web pages..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://localhost:3000/demo-airi.html"
            open "http://localhost:3000/admin-extended.html"
        else
            xdg-open "http://localhost:3000/demo-airi.html" 2>/dev/null || true
            xdg-open "http://localhost:3000/admin-extended.html" 2>/dev/null || true
        fi
        ;;
    0)
        echo "  Skipping platform launch"
        ;;
    *)
        echo "  Invalid choice. Skipping."
        ;;
esac

echo ""
echo "✨ All services started!"
echo ""
echo "Quick Links:"
echo "  Web Demo    : http://localhost:3000/demo-airi.html"
echo "  Admin       : http://localhost:3000/admin-extended.html"
echo "  Health      : http://localhost:3000/health"
echo "  Metrics     : http://localhost:3000/metrics"
echo "  Swagger     : http://localhost:3000/swagger"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
cleanup() {
    echo ""
    echo "👋 Shutting down..."
    kill $FASTAPI_PID $ELYSIA_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done
