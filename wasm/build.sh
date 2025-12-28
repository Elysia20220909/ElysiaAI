#!/bin/bash

# WebAssembly Build Script

set -e

echo "🦀 Building Elysia WebAssembly..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.org/wasm-pack/installer/init.sh -sSf | sh
fi

# Build WASM module
echo "📦 Building WASM module..."
wasm-pack build --target bundler --release

# Minify output
echo "📦 Minifying WASM..."
if command -v wasm-opt &> /dev/null; then
    wasm-opt -Oz -o pkg/elysia_wasm_bg.wasm.opt pkg/elysia_wasm_bg.wasm
    mv pkg/elysia_wasm_bg.wasm.opt pkg/elysia_wasm_bg.wasm
fi

# Create browser bundle
echo "📦 Creating browser bundle..."
cat > pkg/elysia-wasm-browser.js << 'EOF'
// Elysia WebAssembly Browser Bundle
(async () => {
  const wasm = await import('./elysia_wasm.js');
  window.ElysiaWasm = wasm;
})();
EOF

# Output sizes
echo ""
echo "✅ WASM Build Complete!"
echo ""
echo "📊 Output Sizes:"
ls -lh pkg/*.wasm
echo ""
echo "📁 Output files:"
ls -la pkg/
echo ""
echo "🚀 Usage:"
echo "  <script src='pkg/elysia_wasm.js'></script>"
echo "  <script src='pkg/elysia-wasm-browser.js'></script>"
echo ""
echo "  ElysiaWasm.normalize('  hello world  ')"
echo "  ElysiaWasm.word_count('hello world')"
