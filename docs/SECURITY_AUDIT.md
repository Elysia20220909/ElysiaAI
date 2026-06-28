# Security Audit

Last updated: 2026-06-28

## Current Status

- JavaScript/Bun: `bun audit` reports no known vulnerabilities.
- Python local environment: `pip-audit --local` reports no known vulnerabilities after upgrading `setuptools` to `>=78.1.1`, `msgpack` to `>=1.2.1`, and `pydantic-settings` to `>=2.14.2`.
- Supply chain scan: `bun run security:glassworm -- --ci` reports no blocking findings.
- Rust/Tauri: `src-tauri` is upgraded to Tauri `2.11.2`, `tauri-build` `2.6.2`, `reqwest` `0.13.4`, and current compatible lockfile patches.

## Residual Rust Advisory Context

OSV still reports unmaintained `unic-*` advisories through this upstream path:

`tauri 2.11.0 -> tauri-utils 2.9.0 -> urlpattern 0.3.0 -> unic-*`

These advisories are tracked in `scripts/security/audit_dependencies.py` as an explicit allowlist. The audit fails on any unallowlisted Rust advisory.

### Dependabot alert #7: `glib`

Dependabot alert #7 reports `GHSA-wrw7-89jp-8q8g` for `glib` in `src-tauri/Cargo.lock`.

- Severity: medium
- Affected range: `>= 0.15.0, < 0.20.0`
- First patched version: `0.20.0`
- Current resolved path after compatible updates:

```text
tauri 2.11.2 / tauri-runtime 2.11.2 / tauri-runtime-wry 2.11.2
  -> gtk 0.18.2 / webkit2gtk 2.0.2 / wry 0.55.1
  -> glib 0.18.5
```

`cargo update -p glib --precise 0.20.0 --manifest-path src-tauri/Cargo.toml` is not valid because `gtk 0.18.2` requires `glib ^0.18`. The project is on the latest compatible Tauri patch line, so the remaining alert is an upstream Tauri/Linux GTK3 stack constraint rather than an app-level direct dependency. Keep the alert open and revisit when Tauri/Wry moves away from `gtk 0.18` or exposes a compatible Linux WebView stack using `glib >= 0.20`.

Tracking decision: do not dismiss Dependabot alert #7. Track the upstream fix in GitHub issue #104 and treat it as a known upstream dependency risk for Beta 0.1 unless an active exploit path or compatible upstream fix appears.

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

## Notes

- `pip-audit -r requirements.txt` may fail on Windows when `milvus-lite` has no compatible wheel for the temporary audit resolver. Prefer `pip-audit --local` against the project `.venv`.
- `cargo check` on Windows requires the MSVC linker `link.exe` from Visual Studio Build Tools.
