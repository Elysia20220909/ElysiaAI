.PHONY: help install boot start stop status ui logs clean

# 🍒 Elysia OS - UNIX Management Makefile (Ubuntu/macOS) 🍒

help:
	@echo "🍎 Elysia OS UNIX Management 🍎"
	@echo "  make install - System Initialization (Setup)"
	@echo "  make boot    - Start Full OS Resonance Cluster (UI + Kernel)"
	@echo "  make ui      - Start Desktop Environment (Bun/Vite)"
	@echo "  make logs    - Watch Kernel logs in real-time"
	@echo "  make start   - Start Kernel Daemon (elysiad) in background"
	@echo "  make stop    - Stop System Kernel"
	@echo "  make status  - Check System status"
	@echo ""
	@echo "🎉 Environment: Ubuntu / Mac OS (POSIX Standard)"

install:
	@chmod +x scripts/*.sh bin/*
	./scripts/setup.sh

boot:
	@chmod +x scripts/*.sh bin/*
	./scripts/boot.sh

start:
	@chmod +x bin/*
	nohup python3 bin/elysiad > var/log/elysia/kernel.log 2>&1 &
	@echo "✅ Kernel PID: $$!"

stop:
	pkill -f elysiad || echo "⚠️ Elysia Kernel not running."

status:
	python3 bin/elysia status

ui:
	bun run dev

logs:
	tail -f var/log/elysia/kernel.log

clean:
	rm -rf var/log/elysia/*
	rm -rf node_modules
	rm -rf python/__pycache__
	@echo "🧹 System memory purged."
