# AI Coding Harness

ElysiaAI supports Claude Code, Codex, and other agentic coding workflows.

## Recommended Flow

1. Read `CLAUDE.md`
2. Read `AGENTS.md`
3. Read `.Codex/QUICK_START.md`
4. Load task-specific docs from `docs/INDEX.md`

## Quality Gates

```bash
bun run ai:quick
bun run ai:check
bun run ai:security
```

## Philosophy

- Local-first
- Minimal startup context
- Small focused diffs
- Security before automation
- Prefer existing architecture patterns
