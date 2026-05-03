# Quick Start

## Setup

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
```

## Development

```powershell
bun scripts/manage.ts dev
```

Server shortcut:

```powershell
bun run dev
```

Desktop shortcut:

```powershell
bun run desktop
```

## Quality Gates

Use the smallest relevant set for the change:

```powershell
bun run lint
bun run test
bun run typecheck
bun run check:deps
bun run check:encoding
bun run security:glassworm -- --ci
bun run security:audit
```

Full project check:

```powershell
bun scripts/manage.ts check
```

## Key Local Services

- Web UI: `http://localhost:3000`
- Python kernel: see `python/` and `kernel/`
- Local RAG: Milvus Lite
- Local LLM: Ollama
- Voice: VOICEVOX engine must be started by the user
