# ElysiaAI Contribution Guide

Thank you for helping improve ElysiaAI. This repository mixes Bun/Elysia,
FastAPI/Python, local AI tooling, and security-sensitive configuration, so the
main rule is simple: keep changes small, reviewable, and easy to verify.

## Setup

Prerequisites:

- Bun 1.1+
- Python 3.11+
- Docker, only when testing the container stack
- Ollama, when testing local inference flows

```bash
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
```

## Local Quality Gate

Run these before opening a pull request:

```bash
bun run lint
bun run test
bun run typecheck
bun run check:git-hygiene
bun run check:encoding
bun run security:glassworm -- --ci
```

`bun scripts/manage.ts check` runs the Git hygiene and encoding guards plus a
small project-structure audit.

## Git Hygiene

Never commit local secrets, runtime databases, generated logs, or personal
workspace files. In particular, `.env` and `.env.*` are ignored; only
`.env.example` should be tracked.

If Git history may have been overwritten or damaged, stop before pushing to
`origin` and follow `docs/GIT_RECOVERY_RUNBOOK.md`.

If a local environment file is already tracked, remove it from Git without
deleting your local copy:

```bash
git rm --cached .env
```

The `check:git-hygiene` script fails CI if forbidden environment files are
tracked.

## Encoding And Language

All tracked text files must be UTF-8. If Japanese or English text becomes
mojibake, fix the text itself instead of suppressing the check. The
`check:encoding` script scans tracked source and documentation for invalid
UTF-8, replacement characters, and common Windows-1252/CP932 mojibake markers.

## Dependency Policy

- Use `bun install` for JavaScript/TypeScript dependencies.
- Keep Python dependencies aligned through the root `requirements.txt`.
- Do not vendor third-party projects directly unless the license and update
  policy are documented.
- Open-LLM-VTuber should be integrated as an external service through the bridge
  documented in `docs/OPEN_LLM_VTUBER_INTEGRATION.md`.

## Pull Requests

- Use Conventional Commits, such as `feat:`, `fix:`, `docs:`, or `chore:`.
- Include tests or a clear verification note for behavior changes.
- Update README or docs when setup, commands, environment variables, or public
  routes change.
- Keep unrelated formatting churn out of feature PRs when possible.

## Code Style

- TypeScript and JavaScript use Biome: `bun run lint`.
- Python uses Ruff: `python -m ruff check python tests/python tests/test_kernel.py`.
- Prefer existing helpers and route patterns over new framework choices.
