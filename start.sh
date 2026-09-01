#!/bin/bash
# ============================================================
# Emergency Route AI — One-command startup
#
# Builds the React frontend and starts FastAPI so the
# complete application is served from a single URL:
#
#   http://127.0.0.1:8000
#
# Usage:
#   cd ~/Desktop/"emergeny route Ai"
#   ./start.sh
# ============================================================

set -e

# Resolve the project root (directory containing this script)
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo "  Emergency Route AI — Starting integrated application"
echo "============================================================"
echo ""

# ------------------------------------------------------------
# 1. Build the React frontend
# ------------------------------------------------------------
echo "[1/3] Building React frontend..."

FRONTEND_DIR="$PROJECT_ROOT/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: frontend/ directory not found at $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install --silent
fi

# Build the production bundle
echo "  Running npm run build..."
npm run build

if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: frontend/dist not found after build."
    exit 1
fi

echo "  Frontend build complete -> $DIST_DIR"
echo ""

# ------------------------------------------------------------
# 2. Prepare the Python backend
# ------------------------------------------------------------
echo "[2/3] Preparing FastAPI backend..."

BACKEND_DIR="$PROJECT_ROOT/backend"
cd "$BACKEND_DIR"

# Activate the virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "  Using virtual environment: backend/venv"
elif [ -d "bin" ]; then
    # Older venv created directly in backend/
    source bin/activate
    echo "  Using virtual environment: backend/ (root)"
else
    echo "  No virtual environment found, using system Python"
fi

# Verify required packages are available
python -c "import fastapi, uvicorn, psycopg" 2>/dev/null || {
    echo "  Installing backend dependencies..."
    pip install -r requirements.txt
}

echo ""

# ------------------------------------------------------------
# 3. Start FastAPI (serves React + API + WebSocket)
# ------------------------------------------------------------
echo "[3/3] Starting FastAPI on http://127.0.0.1:8000"
echo ""
echo "  Application:  http://127.0.0.1:8000"
echo "  API docs:     http://127.0.0.1:8000/docs"
echo "  Health check: http://127.0.0.1:8000/health"
echo ""
echo "  Press Ctrl+C to stop."
echo "============================================================"
echo ""

# Optionally open the browser on macOS
if command -v open &>/dev/null; then
    (sleep 2 && open "http://127.0.0.1:8000") &
fi

uvicorn main:app --host 127.0.0.1 --port 8000
