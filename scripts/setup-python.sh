#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Setting up Python environment..."

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 was not found. Please install Python 3.11+." >&2
  exit 1
fi

if [[ ! -x ".venv/bin/python" ]]; then
  echo "Creating .venv..."
  python3 -m venv .venv
fi

echo "Installing Python dependencies from requirements.txt..."
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -r requirements.txt

echo "Python environment ready."
echo "Activate with: source .venv/bin/activate"
