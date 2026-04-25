.PHONY: install boot test lint clean

ifeq ($(OS),Windows_NT)
VENV_PY := .venv/Scripts/python.exe
else
VENV_PY := .venv/bin/python
endif

install:
	@echo "--- Installing Bun dependencies ---"
	bun install
	@echo "--- Setting up Python virtual environment ---"
	python -m venv .venv
	@echo "--- Installing Python dependencies ---"
	$(VENV_PY) -m pip install -r requirements.txt
	@echo "--- Generating Prisma client ---"
	bunx prisma generate

boot:
	@echo "--- Booting ElysiaAI Resonance Loop ---"
	bun run boot

test:
	@echo "--- Running all tests ---"
	bun test
	$(VENV_PY) -m pytest tests/python tests/test_kernel.py

lint:
	@echo "--- Running linters ---"
	bun run lint

clean:
	@echo "Cleaning environment..."
	rm -rf .venv node_modules
