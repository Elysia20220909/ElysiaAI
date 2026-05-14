# Security Audit

Last updated: 2026-05-03

## Current Status

- JavaScript/Bun: `bun audit` reports no known vulnerabilities.
- Python local environment: `pip-audit --local` reports no known vulnerabilities after upgrading `setuptools` to `>=78.1.1`.
- Supply chain scan: `bun run security:glassworm -- --ci` reports no blocking findings.
- Rust/Tauri: `src-tauri` is upgraded to Tauri `2.11.0`, `tauri-build` `2.6.0`, `reqwest` `0.13`, and `thiserror` `2.0`.

## Residual Rust Advisory Context

OSV still reports unmaintained `unic-*` advisories through this upstream path:

`tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*`

These advisories are tracked in `scripts/security/audit_dependencies.py` as an explicit allowlist. The audit fails on any unallowlisted Rust advisory.

## How To Run

```bash
bun run security:audit
bun run security:glassworm -- --ci
bun run security:ggshield:scan
bun audit
```

Set up GitGuardian ggshield locally with:

```bash
bun run security:ggshield:setup
```

The setup command installs `ggshield` when missing and then runs `ggshield auth login`.
The scan command summarizes detector names and file locations without printing secret
values. Use `bun run security:ggshield:history` only when a full git-history scan is
needed; it can be slow on large histories.

Python environment checks expect the local `.venv` to contain `pip-audit`. Install it with:

```bash
.venv/Scripts/python.exe -m pip install pip-audit==2.10.0
```

## Notes

- `pip-audit -r requirements.txt` may fail on Windows when `milvus-lite` has no compatible wheel for the temporary audit resolver. Prefer `pip-audit --local` against the project `.venv`.
- `cargo check` on Windows requires the MSVC linker `link.exe` from Visual Studio Build Tools.
