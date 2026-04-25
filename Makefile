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
	bun run dev & .venv/bin/uvicorn kernel.main:app --port 8000 --reload

clean:
	@echo "Cleaning environment..."
	rm -rf .venv node_modules
