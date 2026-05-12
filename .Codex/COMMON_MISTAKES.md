# Common Mistakes

Keep this file small. It is loaded at session start.

## Avoid

- Do not move runtime entry points before checking imports, scripts, Docker, Tauri, and docs references.
- Do not put server-only code in root `src/`; prefer `packages/server/src/lib/` or `packages/server/src/routes/`.
- Do not put shared browser-facing clients in `packages/server`; prefer `packages/shared/src/`.
- Do not commit `.env`, logs, uploads, caches, local editor state, generated deletion results, or dependency folders.
- Do not auto-run game, desktop, or OS input automation. Keep operator scripts manual unless the user explicitly asks.
- Do not load `docs/archive/**`, `.Codex/completions/**`, or `.Codex/sessions/**` during startup.

## Remember

- This is a local-first project. Avoid adding cloud calls unless the user asks.
- Prefer existing Bun, Elysia, FastAPI, Prisma, Tauri, and Rust patterns.
- Use `docs/INDEX.md` to choose task-specific documents.
- Run the smallest relevant quality gate before finishing code changes.
