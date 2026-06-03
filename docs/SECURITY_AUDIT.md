# Security Audit

Last updated: 2026-06-03

## Current Status

- JavaScript/Bun: `bun audit` reports no known vulnerabilities.
- Python local environment: `pip-audit --local` reports no known vulnerabilities after upgrading `setuptools` to `>=78.1.1`.
- Supply chain scan: `bun run security:glassworm -- --ci` reports no blocking findings.
- Rust/Tauri: `src-tauri` is upgraded to Tauri `2.11.0`, `tauri-build` `2.6.0`, `reqwest` `0.13`, and `thiserror` `2.0`.

## CI Integration

The primary dependency audit gate is `bun run security:audit`. It runs:

- `bun audit` for JavaScript and TypeScript dependencies.
- `pip-audit` for Python dependencies, preferring `requirements.lock` and falling back to `requirements.txt`.
- The Rust OSV query in `scripts/security/audit_dependencies.py` for the active Tauri crate tree.

`.github/workflows/security.yml` runs this gate on pull requests, pushes to protected branches, manual dispatch, and the weekly schedule. `.github/workflows/security-tests.yml` also uses the same gate before producing the SBOM artifact, so Python, Bun, and Rust advisories follow one allowlist and one failure policy.

The PyPA `gh-action-pip-audit` action is available upstream, but this repository currently installs `pip-audit` directly and calls the local wrapper. That keeps action pinning simple and preserves the project-specific Python and Rust advisory allowlists in one audited script.

## Residual Rust Advisory Context

OSV still reports unmaintained `unic-*` advisories through this upstream path:

`tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*`

These advisories are tracked in `scripts/security/audit_dependencies.py` as an explicit allowlist. The audit fails on any unallowlisted Rust advisory.

## How To Run

```bash
bun run security:audit
bun run security:glassworm -- --ci
bun audit
```

Python environment checks expect the local `.venv` to contain `pip-audit`. Install it with:

```bash
.venv/Scripts/python.exe -m pip install pip-audit==2.10.0
```

For CI-style local verification after dependency changes, run:

```bash
bun run check:deps
bun run security:audit
```

## Notes

- `pip-audit -r requirements.txt` may fail on Windows when `milvus-lite` has no compatible wheel for the temporary audit resolver. Prefer `pip-audit --local` against the project `.venv`.
- `cargo check` on Windows requires the MSVC linker `link.exe` from Visual Studio Build Tools.
