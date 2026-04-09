.PHONY: help install boot start stop status ui logs clean build check doctor
# 🍒 Elysia OS - Ultimate Manifestation Makefile 🍒

help:
	@echo "🍎 Elysia OS Production Management 🍎"
	@echo "  make install - System Initialization (Setup)"
	@echo "  make boot    - Start Full OS Resonance Cluster (UI + Kernel)"
	@echo "  make build   - [PRODUCTION] Build Standalone OS Installer (Tauri)"
	@echo "  make doctor  - Run System Integrity Diagnostic"
	@echo "  make check   - Verify dependencies and environment"
	@echo "  make clean   - Purge logs and build artifacts"
	@echo ""
	@echo "🎉 Environment: UNIX (Ubuntu / Mac OS / WSL Standard)"

install:
	@chmod +x scripts/*.sh bin/*
	@if [ -f /proc/sys/fs/binfmt_misc/WSLInterop ]; then \
		echo "🐧 WSL2 (Rutile) detected. Manifesting Linux dependencies..."; \
		./scripts/setup_rutile.sh; \
	else \
		./scripts/setup.sh; \
	fi

boot:
	@echo "🌟 Initiating Native OS Resonance..."
	@if [ "$$(expr substr $$(uname -s) 1 5)" != "Linux" ] && [ "$$(expr substr $$(uname -s) 1 6)" != "Darwin" ]; then \
		powershell -ExecutionPolicy Bypass -File scripts/boot.ps1; \
	elif [ -f /proc/sys/fs/binfmt_misc/WSLInterop ]; then \
		echo "🐧 Launching via Rutile Bridge (WSL2)..."; \
		./bin/elysia-linux-boot; \
	else \
		./scripts/boot.sh; \
	fi

build:
	@echo "🚀 Initiating Ultimate Manifestation Build (Tauri Bundle)..."
	bun run tauri build

check:
	@echo "🔍 Integrity Check: Runtime Environment..."
	@python3 --version || python --version || (echo "❌ Python missing"; exit 1)
	@bun --version || (echo "❌ Bun missing"; exit 1)
	@rustc --version || (echo "❌ Rust missing (Tauri requirement)"; exit 1)
	@echo "🔍 Integrity Check: Core & GUI Dependencies..."
	@python3 -c "import fastapi, pyautogui, bs4, PIL" 2>/dev/null || \
	 python -c "import fastapi, pyautogui, bs4, PIL" 2>/dev/null || \
	 (echo "⚠️ Missing Python libraries. Run: pip install -r requirements.txt"; exit 1)
	@echo "✅ All resonance engines operational across target platforms."

doctor:
	python3 usr/lib/elysia/kernel.py --doctor

clean:
	rm -rf var/log/elysia/*
	rm -rf node_modules
	rm -rf src-tauri/target
	@echo "🧹 System memory purged."
