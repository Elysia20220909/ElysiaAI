# Architecture Map

## Main Areas

- `packages/server/` - Bun / Elysia backend and API layer.
- `python/` - FastAPI AI kernel and Python service code.
- `kernel/` - shared kernel logic and AI orchestration helpers.
- `src-tauri/` - Tauri desktop shell.
- `src/` and `public/` - frontend and static assets.
- `prisma/` - schema and migrations.
- `scripts/` - setup, tests, security checks, and workflow automation.
- `tools/` - focused local utilities.
- `config/` - runtime and integration configuration.
- `docs/` - active architecture, security, setup, and integration docs.

## Task Routing

- Server/API change: start in `packages/server/src/`, then check `docs/API.md` and `docs/API_REFERENCE.md`.
- Python/kernel change: start in `python/` or `kernel/`, then run targeted pytest/ruff checks.
- Desktop change: start in `src-tauri/`, then verify Tauri-specific commands.
- Prisma change: inspect `prisma/schema.prisma`, then run dependency and type checks.
- Integration change: check `docs/INTEGRATION_GUIDE.md`, `docs/OPENAI_INTEGRATION.md`, and relevant service docs.
- Security change: check `docs/security/`, `docs/SECURITY.md`, `docs/THREAT_MODEL.md`, and `scripts/security/`.
- Local home server ops: check `docs/LOCAL_HOME_SERVER_OPS.md`, `packages/server/src/lib/local-ops.ts`, and `public/stark-ops.html`.
- Fictional suit system: check `packages/server/src/lib/suit-system.ts`, `public/suit-hud.html`, `public/suit-viewer.html`, and `prompts/aegis-friday-persona.md`.
- FF14/photo tooling: keep scripts manual-launch only; see `docs/learnings/photo-automation.md`.

## Heavy Context

Do not load broad directories unless needed:
- `docs/` entire tree
- `logs/`
- `data/`
- `uploads/`
- `node_modules/`
- `.venv/`
