.PHONY: help up down dev os lint format setup clean start stop status

help:
	@echo "🍎 Elysia OS UNIX Management 🍎"
	@echo "  make start   - Start Elysia Kernel Daemon (elysiad)"
	@echo "  make stop    - Stop Elysia Kernel"
	@echo "  make status  - Check Kernel status"
	@echo "  make ui      - Start Desktop Environment (Vite)"
	@echo "  make setup   - System Initialization"

# Linux/UNIX Daemon Management
start:
	python bin/elysiad &

stop:
	pkill -f elysiad

status:
	python bin/elysia status

ui:
	cd usr/share/elysia-ui && npm run dev

# Legacy & Build
setup:
	bun install
	python -m pip install -r requirements.txt

clean:
	rm -rf var/log/elysia/*

