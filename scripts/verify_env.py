import platform
import subprocess
import sys

from rich.console import Console
from rich.table import Table


console = Console()


def check_command(cmd, name, expected_version=None):
    try:
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, shell=True, encoding="utf-8")
        version = output.split("\n")[0].strip()
        return True, version
    except Exception:
        return False, "Not Found"


def check_ollama_service():
    import httpx

    try:
        res = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
        return True, "Running" if res.status_code == 200 else "Error"
    except Exception:
        return False, "Not Connected"


def check_phi4_model():
    import httpx

    try:
        res = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
        models = [m["name"] for m in res.json().get("models", [])]
        if any("phi-4" in m.lower() for m in models):
            return True, "Installed"
        return False, "Missing (phi-4)"
    except Exception:
        return False, "N/A"


def run_diagnostics():
    console.print("[bold cyan]ElysiaAI Expert Doctor - Diagnostic Suite[/bold cyan]")
    console.print("-" * 50)

    table = Table(title="System Integrity Check")
    table.add_column("Component", style="magenta")
    table.add_column("Status", style="green")
    table.add_column("Version/Notes", style="white")

    # 1. OS & Python
    py_ok = sys.version_info >= (3, 11)
    table.add_row("Python (>=3.11)", "[green]OK[/green]" if py_ok else "[red]FAIL[/red]", platform.python_version())

    # 2. Build Tools
    bun_ok, bun_v = check_command("bun --version", "Bun")
    table.add_row("Bun (Runtime)", "[green]OK[/green]" if bun_ok else "[yellow]SKIP[/yellow]", bun_v)

    cargo_ok, cargo_v = check_command("cargo --version", "Rust/Cargo")
    table.add_row("Cargo (Installer)", "[green]OK[/green]" if cargo_ok else "[yellow]SKIP[/yellow]", cargo_v)

    # 3. AI Stack (Ollama)
    ollama_ok, ollama_v = check_command("ollama --version", "Ollama Client")
    table.add_row("Ollama Client", "[green]OK[/green]" if ollama_ok else "[red]FAIL[/red]", ollama_v)

    svc_ok, svc_v = check_ollama_service()
    table.add_row("Ollama Service", "[green]OK[/green]" if svc_ok else "[red]FAIL[/red]", svc_v)

    phi_ok, phi_v = check_phi4_model()
    table.add_row("phi-4 Model", "[green]OK[/green]" if phi_ok else "[red]FAIL[/red]", phi_v)

    console.print(table)

    if not (py_ok and ollama_ok):
        console.print("[bold red]CRITICAL: Missing core dependencies for ElysiaAI kernel.[/bold red]")
        sys.exit(1)
    else:
        console.print("[bold green]SUCCESS: System resonance within acceptable parameters.[/bold green]")


if __name__ == "__main__":
    run_diagnostics()
