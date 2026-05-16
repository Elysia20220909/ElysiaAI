# ElysiaAI Testing Guide

This guide defines the minimum checks for ElysiaAI changes.

## Documentation-only changes

Run:

```powershell
bun run check:encoding
bun run check:git-hygiene
```

Use this for README, docs, templates, and policy changes that do not touch runtime behavior.

## TypeScript and Bun changes

Run:

```powershell
bun run lint
bun run test
bun run typecheck
bun run check:deps
```

Use this for `packages/`, `src/`, `apps/`, `scripts/`, and frontend/backend TypeScript changes.

## Python kernel changes

Run:

```powershell
python -m ruff check .
python -m ruff format --check .
python -m pytest tests/python tests/test_kernel.py
```

When dependency files change, also test installation from `requirements.txt` or `requirements.lock` if present.

## Rust shield-agent changes

Run:

```powershell
cargo check --manifest-path packages/shield-agent/Cargo.toml
```

If dependencies change, regenerate and review `packages/shield-agent/Cargo.lock`.

## Security-sensitive changes

Run:

```powershell
bun run security:glassworm -- --ci
bun run security:audit
bun run check:git-hygiene
```

Security-sensitive changes include auth, RAG, file access, tool execution, webhook, CI, release, and secret handling paths.

## Verification notes

Each pull request should include:

- Commands run
- Result summary
- Known skipped checks and why
- Risk level
- Rollback notes for risky changes
