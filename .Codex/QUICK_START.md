# Quick Start

Keep this file small. Use it for first orientation, then load task-specific docs
from `docs/INDEX.md`.

## Project Shape

- Bun / Elysia server: `packages/server/`
- Shared TypeScript clients and types: `packages/shared/`
- FastAPI AI kernel: `python/`
- Tauri desktop shell: `src-tauri/`
- Prisma data layer: `prisma/`
- Scripts and operator tools: `scripts/`, `tools/`
- Documentation: `docs/`

## Common Commands

```powershell
bun run dev
bun run typecheck
bun run lint
bun run test
bun run security:audit
```

## Startup Checks

```powershell
git status --short --branch
Get-Content -Raw AGENTS.md
Get-Content -Raw docs/INDEX.md
```

## Notes

- `.Codex/ARCHITECTURE_MAP.md` is the compact implementation map.
- `docs/PROJECT_STRUCTURE.md` is the durable file-placement guide.
- `README.md` and `README.ja.md` are user-facing entry points.
