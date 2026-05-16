# ElysiaAI Claude Code Context

Load this file first.

## Core Rules

- Prefer local-first workflows.
- Do not add cloud APIs unless explicitly requested.
- Prefer Bun / Elysia / FastAPI / Prisma / Tauri patterns already present.
- Run the smallest relevant quality gate before commit.

## Quick Quality Gates

```bash
bun run ai:quick
bun run ai:check
bun run ai:security
```

## Startup Files

Read:

- AGENTS.md
- .Codex/QUICK_START.md
- docs/INDEX.md

Avoid loading:

- docs/archive/**
- .Codex/sessions/**
- .Codex/completions/**
