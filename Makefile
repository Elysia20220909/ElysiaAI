.PHONY: install boot clean

install:
	@echo "--- Installing Bun dependencies ---"
	bun install
	@echo "--- Setting up Python virtual environment ---"
	python -m venv .venv
	@echo "--- Installing Python dependencies ---"
	.venv\Scripts\pip install .
	@echo "--- Initializing Prisma ---"
	bunx prisma init --datasource-provider sqlite

boot:
	@echo "--- Booting ElysiaAI Resonance Loop ---"
	@echo "Starting Bun backend on port 3000 and Python kernel on port 8000..."
	@powershell -Command "Start-Process bun -ArgumentList 'run dev' -NoNewWindow; .venv\Scripts\uvicorn kernel.main:app --port 8000 --reload"

clean:
	@echo "Cleaning environment..."
	@if exist .venv rmdir /s /q .venv
	@if exist node_modules rmdir /s /q node_modules
