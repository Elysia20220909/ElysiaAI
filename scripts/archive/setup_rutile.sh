#!/bin/bash
# 🌸 Elysia OS - Rutile Setup Script (WSL2/Ubuntu) 🌸
set -e

echo "🌟 Manifesting Rutile Dependencies in WSL2..."

# 1. Update OS & Install GUI Dependencies
sudo apt-get update
sudo apt-get install -y curl build-essential libssl-dev pkg-config git \
    libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf \
    python3-venv python3-pip

# 2. Install Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun Runtime..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# 3. Install Rust/Cargo
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust/Cargo Cluster..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# 4. Neural Bridging (Python Deps)
echo "🧠 Aligning Neural Dependencies..."
pip3 install -r requirements.txt --break-system-packages || true

# 5. Path Alignment
SHELL_CONFIG="$HOME/.bashrc"
if ! grep -q "BUN_INSTALL" "$SHELL_CONFIG"; then
    echo "🔗 Linking binary paths to $SHELL_CONFIG..."
    echo 'export PATH="$HOME/.cargo/bin:$HOME/.bun/bin:$PATH"' >> "$SHELL_CONFIG"
fi

echo "✅ Rutile Distribution is now Complete and Linked. (^_^) "
