.PHONY: install boot clean

install:
	@echo "--- Installing Bun dependencies ---"
	bun install
	@echo "--- Setting up Python virtual environment ---"
	python3 -m venv .venv
	@echo "--- Installing Python dependencies ---"
	.venv/bin/pip install .
	@echo "--- Initializing Prisma ---"
	bunx prisma init --datasource-provider sqlite

boot:
	@echo "--- Booting ElysiaAI Resonance Loop ---"
	@echo "Starting Bun backend on port 3000 and Python kernel on port 8000..."
	# Run both servers in the background
	(.venv/bin/uvicorn python.fastapi_server:app --port 8000 --reload &); \
	bun run dev

test:
	@echo "--- Running all tests ---"
	bun test
	.venv/bin/pytest tests/test_kernel.py

lint:
	@echo "--- Running linters ---"
	bun run lint

clean:
	@echo "Cleaning environment..."
	rm -rf .venv node_modules
