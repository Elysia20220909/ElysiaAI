#!/bin/bash

# Elysia Cross-Platform Test & Build Script (Bash/Linux version)

set -e

ACTION="${1:-all}"
VERSION="${2:-1.0.0}"
SKIP_DOCKER="${SKIP_DOCKER:-false}"

echo "🚀 Elysia Cross-Platform Test & Build Script"
echo "=============================================="
echo ""

# Check prerequisites
check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

check_prerequisites() {
    echo "🔍 Checking prerequisites..."

    local missing=()

    if ! check_command "git"; then missing+=("git"); fi
    if ! check_command "node"; then missing+=("node"); fi
    if ! check_command "npm"; then missing+=("npm"); fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo "❌ Missing required tools:"
        printf '  - %s\n' "${missing[@]}"
        exit 1
    fi

    local optional=()
    check_command "cargo" || optional+=("cargo (Rust)")
    check_command "bun" || optional+=("bun")
    check_command "docker" || optional+=("docker")
    check_command "wasm-pack" || optional+=("wasm-pack")

    if [ ${#optional[@]} -gt 0 ]; then
        echo "⚠️  Optional tools not installed:"
        printf '  - %s\n' "${optional[@]}"
        echo ""
    fi

    echo "✅ Prerequisites check passed"
    echo ""
}

# Test phase
run_tests() {
    echo "🧪 Running Tests..."
    echo "==================="
    echo ""

    # Rust tests
    if check_command "cargo"; then
        echo "📦 Rust library tests..."
        cd rust
        cargo test --release
        cd ..
        echo "✅ Rust tests complete"
        echo ""
    fi

    # Native addon tests
    if [ -f "native/package.json" ]; then
        echo "📦 Native addon tests..."
        cd native
        npm test
        cd ..
        echo "✅ Native tests complete"
        echo ""
    fi

    # Desktop app tests
    if [ -f "desktop/package.json" ]; then
        echo "📦 Desktop app tests..."
        cd desktop
        npm test
        cd ..
        echo "✅ Desktop tests complete"
        echo ""
    fi

    echo "🎉 All tests passed!"
}

# Build phase
run_build() {
    echo "🔨 Building Artifacts..."
    echo "========================="
    echo ""

    # Rust build
    if check_command "cargo"; then
        echo "📦 Building Rust library..."
        cd rust
        cargo build --release
        cd ..
        echo "✅ Rust build complete"
    fi

    # WASM build
    if check_command "wasm-pack"; then
        echo "📦 Building WebAssembly..."
        cd wasm
        wasm-pack build --target bundler --release
        echo "✅ WASM build complete"

        if [ -f "pkg/elysia_wasm_bg.wasm" ]; then
            size=$(wc -c < "pkg/elysia_wasm_bg.wasm")
            echo "  WASM size: $size bytes"
        fi

        cd ..
    fi

    # Desktop build
    if [ -f "desktop/package.json" ]; then
        echo "📦 Building Desktop app..."
        cd desktop
        npm run build:release
        cd ..
        echo "✅ Desktop build complete"
    fi

    # Game server build
    if [ -f "ElysiaAI/game/package.json" ] && check_command "bun"; then
        echo "📦 Building Game server..."
        cd ElysiaAI/game
        bun run build:standalone
        cd ../..
        echo "✅ Game server build complete"
    fi

    echo ""
    echo "✅ All builds complete!"
}

# Release phase
create_release() {
    echo "📦 Creating Release..."
    echo "======================"
    echo ""

    # Check git status
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  Git working directory has changes"
        echo "  Stage and commit changes before release"
        return
    fi

    echo "📌 Creating git tag v$VERSION..."
    git tag -a "v$VERSION" -m "Release $VERSION" -f

    echo "📤 Pushing tag to remote..."
    git push origin "v$VERSION" -f

    echo "✅ Release created: v$VERSION"
    echo ""
    echo "📍 Next steps:"
    echo "  1. Check GitHub Actions workflows"
    echo "  2. Monitor: .github/workflows/release.yml"
    echo "  3. Artifacts will be auto-published to GitHub Releases"
}

# Docker build (optional)
build_docker() {
    if [ "$SKIP_DOCKER" = "true" ] || ! check_command "docker"; then
        echo "⏭️  Skipping Docker build"
        return
    fi

    echo "🐳 Building Docker Image..."
    echo "==========================="
    echo ""

    echo "📦 Building game server image..."

    if check_command "docker"; then
        if docker buildx version &>/dev/null; then
            echo "  Using buildx for multi-arch..."
            docker buildx build --platform linux/amd64,linux/arm64 \
                -t elysia-game:$VERSION \
                -t elysia-game:latest \
                -f ElysiaAI/game/Dockerfile \
                --load .
        else
            echo "  Using standard docker build..."
            docker build -t elysia-game:$VERSION -t elysia-game:latest \
                -f ElysiaAI/game/Dockerfile .
        fi

        echo "✅ Docker build complete"
    fi
}

# Main execution
check_prerequisites

case "$ACTION" in
    test)
        run_tests
        ;;
    build)
        run_build
        build_docker
        ;;
    release)
        create_release
        ;;
    all)
        run_tests
        run_build
        build_docker
        echo ""
        echo "📝 Release steps:"
        echo "  To create release, run:"
        echo "  ./scripts/run-all.sh release $VERSION"
        ;;
    *)
        echo "Usage: $0 {test|build|release|all} [version]"
        exit 1
        ;;
esac

echo ""
echo "✅ Script execution complete!"
echo ""
