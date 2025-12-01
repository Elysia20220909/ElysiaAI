Third-Party Notices

This repository contains multiple components with different licenses. Please review the following:

1) Main application (this repository root)
- License: MIT (see LICENSE)
- Scope: Source code under directories such as `src/`, `public/`, `scripts/`, and `python/` (excluding `network_simulation/`).

2) Included subproject: `network_simulation/`
- License: See `network_simulation/LICENSE` (original license of the imported project). Do not remove or alter.
- Note: This subproject is kept as a separate work. It is not statically linked into the main app and can be used independently. Distribution or modification must follow its own license.

3) Models, data, and external services
- Ollama models (e.g., `llama3.2`) may be subject to separate terms from their providers. You must review and accept the applicable model licenses before use.
- SentenceTransformers model `all-MiniLM-L6-v2` and other ML artifacts have their own licenses as defined by their publishers. Consult each model card.

4) JavaScript/Node dependencies
To generate a machine-readable license inventory for production dependencies:

```powershell
# from project root
npx license-checker --production --json > third_party_licenses_node.json
npx license-checker --production --summary
```

5) Python dependencies
To generate a license inventory for the Python environment:

```powershell
# Activate venv first
# .\scripts\setup-python.ps1
python -m pip install pip-licenses
pip-licenses --format=json --with-license-file --output-file=third_party_licenses_python.json
pip-licenses --from=mixed --with-system --summary
```

6) Attribution reminders
- When redistributing binaries or packaged artifacts, include:
  - This repository’s `LICENSE`
  - `network_simulation/LICENSE` (unchanged)
  - Third-party license summaries generated above (optional but recommended)
- If you bundle model files, include their license and Terms in your distribution.

If you have a preferred project-wide license other than MIT, let us know and we can switch the root `LICENSE` and update `package.json` accordingly.
