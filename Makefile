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
	./scripts/setup.sh

boot:
	@chmod +x scripts/*.sh bin/*
	./scripts/boot.sh

build:
	@echo "🚀 Initiating Ultimate Manifestation Build (Tauri Bundle)..."
	bun run tauri build

check:
	@echo "🔍 Integrity Check: Runtime Environment..."
	@python3 --version || (echo "❌ Python 3 missing"; exit 1)
	@bun --version || (echo "❌ Bun missing"; exit 1)
	@rustc --version || (echo "❌ Rust missing (Tauri requirement)"; exit 1)
	@echo "✅ All resonance engines operational."

doctor:
	python3 usr/lib/elysia/kernel.py --doctor

clean:
	rm -rf var/log/elysia/*
	rm -rf node_modules
	rm -rf src-tauri/target
	@echo "🧹 System memory purged."
