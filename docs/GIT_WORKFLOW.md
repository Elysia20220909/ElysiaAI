# ElysiaAI Git Workflow

## Principles

- Keep changes small.
- Separate docs, CI, security, and runtime changes.
- Prefer topic branches.
- Use Conventional Commits.
- Avoid unrelated formatting churn.

## Branch Naming

```text
<area>/<purpose>
```

Examples:

```text
docs/project-readiness-map
ci/harden-workflows
security/rag-safety-guards
backend/healthcheck-fixes
```

## Commit Style

Examples:

```text
docs: add MVP definition
ci: harden workflow triggers
fix: stabilize bun install path
security: tighten secret scanning
```

## Pull Request Rules

- Include verification notes.
- Keep scope narrow.
- Update docs when changing setup or public APIs.
- Avoid mixing runtime and documentation changes.

## Recommended Checks

### Docs only

```powershell
bun run check:encoding
bun run check:git-hygiene
```

### Runtime changes

```powershell
bun run lint
bun run test
bun run typecheck
```

### Security-sensitive changes

```powershell
bun run security:glassworm -- --ci
```

## Rollback Rule

Every risky PR should document rollback steps.
