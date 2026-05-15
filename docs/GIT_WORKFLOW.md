# ElysiaAI Git Workflow

This guide keeps ElysiaAI changes small, reviewable, and safe.

ElysiaAI touches local AI, auth, RAG, desktop code, and security-sensitive
configuration. A calm Git workflow protects the project from large, tangled
changes that are hard to test or roll back.

## Core principles

- Prefer small changes over large omnibus changes.
- Use one branch for one theme.
- Keep documentation, implementation, CI, and security changes separate when
  possible.
- Use Conventional Commits.
- Run the relevant quality gate before opening or merging a pull request.
- Never commit secrets, local databases, generated logs, or private RAG content.

## Branch naming

Use this pattern:

```text
<area>/<short-purpose>
```

Recommended areas:

| Area | Use for |
| --- | --- |
| `docs/` | Documentation and guides |
| `ci/` | GitHub Actions and automation |
| `security/` | Auth, RAG safety, secret handling, policy |
| `backend/` | Bun / Elysia server changes |
| `kernel/` | FastAPI / Python AI Kernel changes |
| `ui/` | Web UI and static assets |
| `desktop/` | Tauri / Rust shell |
| `infra/` | Docker, deployment, local server ops |
| `chore/` | Maintenance without behavior change |

Examples:

```text
docs/project-readiness-map
docs/mvp-definition
ci/pin-actions-to-sha
security/rag-safety-guards
backend/healthcheck-errors
kernel/rag-import-flow
ui/dashboard-screenshots
desktop/tauri-distribution-notes
```

## Commit style

Use Conventional Commits:

```text
docs: add mvp definition
fix: handle missing fastapi kernel gracefully
feat: add rag import status endpoint
chore: refresh dependency audit notes
security: tighten webhook secret handling
ci: pin github actions to immutable refs
```

Guidelines:

- One commit should explain one meaningful change.
- Avoid "big cleanup" commits that mix formatting, docs, and behavior changes.
- Prefer Japanese or English consistently within a commit message. English is
  recommended for cross-tool compatibility.

## Pull request scope

Before opening a PR, write a short scope statement:

```md
## Scope
- Adds MVP definition
- Adds Git workflow guide
- Updates docs index

## Out of scope
- No runtime behavior changes
- No CI changes
- No dependency changes
```

This prevents the review from becoming a foggy forest.

## Quality gate

Run only the checks that match the change, then document the result.

### Documentation-only PR

```powershell
bun run check:encoding
bun run check:git-hygiene
```

### TypeScript / backend PR

```powershell
bun run lint
bun run test
bun run typecheck
bun run check:git-hygiene
bun run check:encoding
```

### Python / kernel PR

```powershell
bun scripts/manage.ts setup-python
python -m pytest
python -m ruff check python tests/python tests/test_kernel.py
```

### Security-sensitive PR

```powershell
bun run security:glassworm -- --ci
bun run security:audit
bun run check:git-hygiene
```

## Review checklist

Use this checklist for each PR:

- [ ] The branch name matches the change area.
- [ ] The PR has a narrow scope.
- [ ] The PR explains what is out of scope.
- [ ] Tests or verification notes are included.
- [ ] Docs are updated if commands, routes, env vars, or setup changed.
- [ ] Secrets are not present in diffs, screenshots, logs, or examples.
- [ ] RAG content is treated as untrusted reference material.
- [ ] Destructive actions and external posts require human confirmation.

## Handling large changes

When a change becomes large, split it.

Suggested split order:

1. Documentation or design note.
2. Infrastructure or setup change.
3. Core implementation.
4. Tests.
5. UI polish.
6. Follow-up cleanup.

This makes the project easier to review and easier to rescue if something goes
wrong.

## Rollback rule

Every risky PR should have a rollback note:

```md
## Rollback
Revert this PR. No migration or data cleanup is required.
```

If rollback requires manual steps, document them before merging.

## Default branch

The default branch is `master`. Do not force-push it. Work from topic branches,
then merge through a reviewed pull request when possible.

Steady hands, clean branches, bright logs.
