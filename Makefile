.PHONY: install boot test lint clean

install:
	@echo "--- Installing Bun dependencies ---"
	bun install
	@echo "--- Setting up Python virtual environment ---"
	python -m venv .venv
	@echo "--- Installing Python dependencies ---"
	.venv/bin/python -m pip install -r requirements.txt
	@echo "--- Generating Prisma client ---"
	bunx prisma generate

boot:
	@echo "--- Booting ElysiaAI Resonance Loop ---"
	@echo "Starting Bun backend on port 3000 and Python kernel on port 8000..."
	(.venv/bin/uvicorn python.fastapi_server:app --port 8000 --reload &); \
	bun run dev

test:
	@echo "--- Running all tests ---"
	bun test
	.venv/bin/python -m pytest tests/python tests/test_kernel.py

lint:
	@echo "--- Running linters ---"
	bun run lint

clean:
	@echo "Cleaning environment..."
	rm -rf .venv node_modules
