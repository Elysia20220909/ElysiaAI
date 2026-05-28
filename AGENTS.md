# ElysiaAI Codex Context

Load this file first. Keep startup context small.

## Project

ElysiaAI is a local-first AI-native OS experiment with:
- Bun / Elysia server in `packages/server/`
- FastAPI AI kernel in `python/` and `kernel/`
- Tauri desktop shell in `src-tauri/`
- Prisma data layer in `prisma/`
- Scripts and automation in `scripts/` and `tools/`

## Startup Files

Read these at session start:
- `.Codex/COMMON_MISTAKES.md`
- `.Codex/QUICK_START.md`
- `.Codex/ARCHITECTURE_MAP.md`

Do not auto-load historical work:
- `.Codex/completions/**`
- `.Codex/sessions/**`
- `docs/archive/**`

Use `docs/INDEX.md` to load task-specific docs only when needed.

## Working Rules

- Prefer existing Bun, Elysia, FastAPI, Prisma, and Tauri patterns.
- Keep local privacy assumptions intact; do not add cloud calls unless requested.
- Never auto-run game or desktop input automation. Require explicit manual launch.
- Do not commit `.env`, logs, generated deletion results, uploads, or local caches.
- Before finishing code changes, run the smallest relevant quality gate.

## ICE Security Rules

- Never disable Gitleaks, CodeQL, security audit, or test workflows.
- Never commit secrets, tokens, webhook URLs, or private keys.
- Treat `.github/workflows/`, `scripts/`, `python/`, `kernel/`, `prisma/`, and `src-tauri/` as protected zones.
- Treat self-hosted runners as protected execution zones.
- Keep `pull_request` workflows GitHub-hosted, read-only, and free of privileged secrets.
- Never combine `pull_request_target` with self-hosted runners.
- Require ICE runner labels for self-hosted jobs: `ice-linux-trusted`, `ice-macos-trusted`, `ice-windows-trusted`, or `ice-arm64-lab`.
- Prefer small focused PRs.
- Avoid large integration PRs.
- Explain security impact for workflow or auth changes.
- Respect CODEOWNERS intent for security-sensitive paths.
- Prefer fail-closed behavior where practical.

## Preferred Branch Style

Use:

```text
codex/security-gitleaks
codex/auth-hardening
codex/server-cors-guard
```

Avoid:

```text
codex/all-in-one
codex/massive-refactor
integrate-everything
```

## Required Checks

Expected CI checks:

- Gitleaks Secret Detection
- CodeQL Analysis
- ICE Runner Policy
- Security Audit
- Unit Tests
- OWASP ZAP where applicable

## Common Commands

```powershell
bun run lint
bun run test
bun run typecheck
bun run security:audit
```

For setup and integrated checks, see `.Codex/QUICK_START.md`.
