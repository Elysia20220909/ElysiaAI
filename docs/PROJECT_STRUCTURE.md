# ElysiaAI Project Structure

This is the current working map for the repository. Keep it practical: new code
should land where future maintainers will naturally look first.

## Top-Level Map

```text
ElysiaAI/
├── .Codex/                 # Small startup context for Codex agents
├── .github/                # CI workflows and GitHub metadata
├── config/                 # Checked-in configuration templates and defaults
├── dashboard/              # Standalone experimental dashboard assets
├── data/                   # Small tracked state files only
├── deploy/                 # Deployment examples and platform config
├── docs/                   # Architecture, security, API, and operations docs
├── kernel/                 # Kernel-side support files and experiments
├── locales/                # i18n locale resources
├── packages/
│   ├── server/             # Bun / Elysia API server
│   ├── shared/             # Shared TypeScript types and browser-safe clients
│   └── shield-agent/       # Rust security / native sentinel component
├── prisma/                 # Prisma schema and migrations
├── prompts/                # Prompt templates and persona material
├── public/                 # Web UI static assets and standalone pages
├── python/                 # FastAPI AI kernel, RAG, and Python tests
├── scripts/                # Setup, local ops, CI helpers, and automation
├── src/                    # Root TypeScript config plus experimental forge code
├── src-tauri/              # Tauri desktop shell
├── tests/                  # Cross-package Bun integration and system tests
├── tools/                  # Operator-facing local utility scripts
├── usr/                    # Packaged local runtime resources
└── var/                    # Local runtime state placeholder
```

## Primary Ownership

| Area | Owns | Put new files here when |
| --- | --- | --- |
| `packages/server/src/lib/` | Server-side domain logic | The code is used by routes, jobs, auth, telemetry, or server-only integrations. |
| `packages/server/src/routes/` | HTTP route composition | The change adds or reshapes an Elysia endpoint. |
| `packages/shared/src/` | Shared TypeScript contracts | Browser, Tauri, tests, and server can all import the same type or client. |
| `python/` | Cognitive kernel | The change belongs to FastAPI, RAG, local AI tools, or Python tests. |
| `src-tauri/` | Desktop shell | The change needs Tauri commands, native windows, tray, or packaged desktop behavior. |
| `prisma/` | Database model | The change updates schema, migrations, or generated client boundaries. |
| `scripts/` | Project automation | The command is part of setup, CI, repo checks, or repeatable maintenance. |
| `tools/` | Operator utilities | The script is manually run by an operator and may touch local OS/game/system state. |
| `docs/` | Durable project knowledge | The content explains architecture, operations, security, or integration behavior. |
| `.Codex/` | Agent startup memory | The content must be short enough to load at session start. |

## Runtime And Generated State

Do not commit local runtime state unless there is an explicit reason and a
reviewable fixture format.

- Keep secrets in `.env` or local private config only; track `.env.example`.
- Keep logs out of Git: `logs/`, `**/logs/`, `*.log`.
- Keep uploads, backups, local caches, and generated deletion results out of Git.
- Keep dependency and build output out of Git: `node_modules/`, `.venv/`, `dist/`, `build/`, `src-tauri/target/`.
- Keep editor state out of Git: `.vs/` and other machine-local workspace files.
- Commit small seed/state files only when they are deliberately part of the product or tests.

## Placement Rules

- Prefer existing layer boundaries before creating a new directory.
- Put reusable TypeScript models in `packages/shared/src/types.ts` or a focused shared module.
- Put server-only helpers in `packages/server/src/lib/`, not root `src/`.
- Put new HTTP surfaces in `packages/server/src/routes/` and register them from `packages/server/src/index.ts`.
- Put Python tests beside Python kernel code under `python/tests/`; put Bun/system tests under `tests/` or the package being tested.
- Put long-lived documentation in `docs/`; keep root Markdown for entry points such as `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`.
- Put exploratory or fictional design notes under `docs/fictional/` when they are not implementation contracts.
- Put operator scripts that can affect the local machine in `tools/` and make defaults read-only or confirmation-friendly.

## Root File Policy

Root files should stay boring and discoverable. Add a new root file only when a
tool expects it there or it is a common project entry point.

Acceptable root files include:

- Project entry docs: `README.md`, `README.ja.md`, `README.en.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- Package and tool config: `package.json`, `bun.lock`, `tsconfig.json`, `pyproject.toml`, `biome.json`, `ruff.toml`.
- Runtime launch shims kept for compatibility: `server.ts`, `AETHER_Vault.bat`, `AETHER_Vault_Launcher.py`.

If a file is mostly explanatory, prefer `docs/`. If it is mostly operational,
prefer `scripts/` or `tools/`.

## Current Caution Zones

- `src/forge/` contains experimental cross-language prototypes. Move code out only after identifying importers and launch paths.
- `dashboard/` and `public/standalone/` are standalone visual surfaces. Avoid merging them into server routes without a UI pass.
- `python/data/` contains tracked vault/shard examples. Treat it as sensitive test-like state and review before adding more.
- `usr/` and `var/` model local runtime layout. Keep generated state out of Git unless it is a deliberate packaged resource.
- `.Codex/` should remain concise. Historical work belongs in `docs/archive/`, not startup context.

## Quality Gates

Run the smallest relevant gate after structural changes.

```powershell
bun run typecheck
bun run lint
bun run test
```

For documentation-only changes, prefer a targeted spelling/format review and
`git diff --check`.
