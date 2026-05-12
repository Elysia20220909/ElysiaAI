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

## Common Commands

```powershell
bun run lint
bun run test
bun run typecheck
bun run security:audit
```

For setup and integrated checks, see `.Codex/QUICK_START.md`.
