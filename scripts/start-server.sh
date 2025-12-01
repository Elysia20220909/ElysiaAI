#!/bin/bash
# Start Elysia AI server with Ollama support
# Works on Linux, macOS, and WSL

# Add Ollama to PATH if not already present
if command -v ollama &> /dev/null; then
    echo "✓ Ollama found in PATH"
else
    echo "⚠ Ollama not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -fsSL https://ollama.com/install.sh | sh
    else
        # Linux
        curl -fsSL https://ollama.com/install.sh | sh
    fi
fi

# Check if model is downloaded
if ! ollama list | grep -q "llama3.2"; then
    echo "Downloading llama3.2 model..."
    ollama pull llama3.2
fi

# Start Ollama service in background if not running
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama service..."
    ollama serve &
    sleep 2
fi

# Start the development server
echo "Starting Elysia AI server..."
if command -v bun &> /dev/null; then
    bun src/index.ts
elif command -v node &> /dev/null; then
    node dist/index.js
else
    echo "Error: Neither bun nor node found. Please install one of them."
    exit 1
fi
