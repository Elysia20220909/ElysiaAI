# ElysiaAI MVP Definition

## Core Goal

ElysiaAI should be able to:

1. Start locally.
2. Connect Bun / Elysia and FastAPI.
3. Use a local LLM through Ollama.
4. Perform a minimal RAG retrieval.
5. Run documented quality checks.

## MVP Scope

### Required

- Bun / Elysia backend
- FastAPI AI Kernel
- Ollama local inference
- Local RAG flow
- Basic desktop shell
- Security checks
- CI validation

### Not Required Yet

- Full multi-user UI
- Distributed mesh networking
- Autonomous agents
- Full mobile client
- Production cloud deployment

## Acceptance Checklist

- `bun scripts/manage.ts dev` starts successfully
- `python` kernel responds
- Ollama returns a response
- RAG retrieves at least one document
- `bun run lint` passes
- `bun run test` passes
- `bun run typecheck` passes
- `bun run check:encoding` passes
- `bun run check:git-hygiene` passes

## Definition of Done

A contributor should be able to clone the repository, run setup commands, launch the stack locally, ask one AI question, and run the documented checks without hidden setup steps.
