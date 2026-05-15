# ElysiaAI MVP Definition

This document defines the smallest useful version of ElysiaAI.

The goal is not to limit the dream. The goal is to give the project a steady
harbor: a clear point where contributors can say, "this version is usable,
reviewable, and safe enough to build on."

## Purpose

ElysiaAI is a local-first AI-native OS experiment that combines:

- Bun / Elysia backend
- FastAPI AI Kernel
- Tauri desktop shell
- Ollama local inference
- Local RAG / memory
- Security and quality gates

The MVP should prove the core loop:

```text
User -> UI -> Bun backend -> FastAPI kernel -> local model / memory -> response
```

## MVP must include

### 1. Local startup path

The project should start from a clean checkout with documented commands.

Required:

- `bun scripts/manage.ts setup`
- `bun scripts/manage.ts setup-python`
- `bun scripts/manage.ts dev`

Acceptance criteria:

- A new developer can reach the local web UI.
- Missing `.env` values are explained by `.env.example` or documentation.
- Failure modes are covered in `docs/TROUBLESHOOTING.md`.

### 2. Backend health and routing

The Bun / Elysia backend should expose a health signal and route traffic to the
AI Kernel when the kernel is available.

Acceptance criteria:

- Backend starts without crashing.
- Health checks describe service state clearly.
- Kernel proxy failures return a useful error instead of silent failure.

### 3. FastAPI AI Kernel baseline

The Python kernel should support a minimal inference path and return predictable
JSON responses.

Acceptance criteria:

- Kernel starts with Python 3.11+.
- Kernel has a health check.
- A simple prompt can be processed through the Resonance Loop.
- Kernel errors avoid leaking secrets or private paths.

### 4. Ollama local inference

The MVP should support at least one documented local model.

Recommended baseline:

```powershell
ollama pull llama3.2
```

Acceptance criteria:

- Ollama connection failures are visible.
- The selected model name is documented.
- A local-only inference path can be tested without cloud credentials.

### 5. Minimal RAG / memory flow

The MVP should support a small local knowledge flow.

Acceptance criteria:

- One local document or text sample can be added to memory.
- A query can retrieve relevant context.
- Retrieved text is treated as reference material, not instructions.
- Private documents are not logged or exported by default.

### 6. Security baseline

Security is part of the MVP, not a later decoration.

Acceptance criteria:

- `.env` and secret files are not tracked.
- JWT and auth secrets are not left at production defaults.
- Webhook URLs are treated as bearer credentials.
- RAG content cannot override system, operator, or administrator policy.
- Destructive or external actions require human confirmation.

### 7. Quality gate

The MVP must be easy to verify locally.

Minimum commands:

```powershell
bun run lint
bun run test
bun run typecheck
bun run check:git-hygiene
bun run check:encoding
bun run security:glassworm -- --ci
```

Recommended integration command:

```powershell
bun scripts/manage.ts check
```

Acceptance criteria:

- Documentation says which commands were run.
- Known failures are listed with reason and follow-up.
- Pull requests avoid mixing unrelated changes.

## MVP should not include yet

These are valuable, but they are not required for the first stable usability
target:

- Full multi-user administration UI
- Mobile client
- Full Tauri installer distribution
- Autonomous external posting
- Full VTuber production workflow
- Distributed Sovereign Mesh
- AbyssRTOS integration
- Advanced agent autonomy without review gates

## Readiness checklist

| Area | MVP status target | Evidence |
| --- | --- | --- |
| Setup | New developer can start locally | README and setup commands |
| Backend | Bun / Elysia starts and serves UI / API | Health output |
| Kernel | FastAPI starts and responds | Kernel health output |
| Model | Ollama model can answer a simple prompt | Manual test log |
| Memory | One document can be indexed and queried | RAG test note |
| Security | Secrets and RAG safety rules are enforced | Security docs and checks |
| Quality | Core checks run locally | Command output |
| Docs | Index, API, environment, troubleshooting are linked | `docs/INDEX.md` |

## Definition of done

The MVP is done when a contributor can:

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Install Bun and Python dependencies.
4. Start the backend and kernel.
5. Ask one local AI question.
6. Run one RAG retrieval.
7. Run the documented quality gate.
8. Understand current limitations from the docs.

When these are true, ElysiaAI is no longer only a constellation. It becomes a
small, dependable observatory.
