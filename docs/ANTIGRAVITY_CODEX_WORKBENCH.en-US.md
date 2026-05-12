# Antigravity / Codex Workbench US English Operating Spec

This document is the US English operating spec for the ElysiaAI Antigravity /
Codex Workbench.

The workbench coordinates two agent styles:

- Antigravity-style mission control for plans, browser validation, screenshots,
  task lists, and walkthrough artifacts.
- Codex-style implementation for scoped code edits, tests, typecheck, lint, and
  concise diff summaries.

External IDE and Codex launch are preapproved for local operator workflows. That
permission does not weaken the safety boundary around secrets, destructive
commands, production deployment, or broad repository changes.

## Operating Position

The workbench is not a free-for-all agent launcher.

It keeps a traditional engineering chain of custody:

- Define scope.
- Assign work to the right surface.
- Preserve review points.
- Verify changes.
- Keep the operator in charge of release and risk acceptance.

## Runtime Responsibilities

| Runtime | Role | Authority | Best Use |
| --- | --- | --- | --- |
| `antigravity` | Mission control | Local launch allowed, plan-first | Multi-step planning, browser evidence, artifacts, walkthroughs |
| `codex` | Implementation agent | Local launch allowed, confirm risky work | Code edits, tests, typecheck, lint, diff-ready implementation |
| `human_review` | Operator approval | Final authority | Scope, release, deployment, secrets, residual risk |
| `local_policy` | Safety gate | Deny unsafe work | Blocks destructive, secret-harvesting, or policy-bypass requests |

## Launch Policy

Local launch is allowed for approved development surfaces:

- `codex`
- `agy`
- `antigravity`
- explicit paths through `ELYSIA_CODEX_BIN` or `ELYSIA_ANTIGRAVITY_BIN`

Launch rules:

- Launch local tools only.
- Do not pass secrets, tokens, credentials, or `.env` values.
- Do not pass destructive shell commands as launch arguments.
- Do not use launch as a shortcut around review for deploy, push, publish,
  migration, or broad cleanup work.
- Stop if the executable is not found.

CLI examples:

```powershell
bun run agents -- launch --target codex
bun run agents -- launch --target codex --request "Implement the next scoped patch"
bun run agents -- launch --target antigravity
```

## API

The API remains protected by the existing neural session boundary.

### `GET /api/agents/workbench/status`

Returns:

- runtime capabilities
- launch policy
- command policy
- hard rules
- documentation links

### `POST /api/agents/workbench/plan`

Example:

```json
{
  "request": "Implement a responsive UI and verify it with screenshots",
  "mode": "review_driven"
}
```

Available modes:

| Mode | Meaning |
| --- | --- |
| `review_driven` | Default. Keeps review points visible. |
| `balanced` | Balances planning and implementation. |
| `codex_first` | Biases toward scoped implementation. |
| `antigravity_first` | Biases toward planning and browser evidence. |

## Classification

| Task Kind | Example | Default Decision |
| --- | --- | --- |
| `feature_implementation` | Add or integrate a feature | allow |
| `frontend_validation` | UI, browser, screenshot, responsive checks | allow |
| `bug_fix` | Fix a regression or failing behavior | allow |
| `test_generation` | Add tests, lint, CI, typecheck work | allow |
| `security_review` | Defensive review or threat-model work | allow |
| `docs_update` | README, guide, runbook, spec work | allow |
| `repo_maintenance` | Cleanup, dependency, broad maintenance | confirm |
| `deployment_release` | Push, PR, release, deploy, migration | confirm |
| `destructive_or_secret` | Secret extraction, drive wipe, force reset | deny |
| `unmapped` | Anything not safely classified | confirm |

## Safety Boundary

The following remain blocked or review-gated:

- Secret harvesting, printing, upload, or commit.
- Broad deletion, drive wipe, `git reset --hard`, force push.
- Production deploy, publish, migration, or release without operator approval.
- Hidden process launch that bypasses the workbench.
- Browser or terminal actions that handle untrusted content without review.

## Recommended Flow

1. Run `bun run agents -- plan --request "..."`.
2. Review `taskKind`, `decision`, `launch`, `controls`, and
   `blockedCapabilities`.
3. Launch Codex or Antigravity locally when useful.
4. Use the generated handoff prompt instead of improvising broad instructions.
5. Run the smallest relevant quality gate.
6. Keep final adoption, push, deploy, and release with the operator.

## Files

- `packages/server/src/lib/agent-workbench.ts`
- `packages/server/src/lib/agent-workbench.test.ts`
- `packages/server/src/routes/neural-system-routes.ts`
- `packages/server/src/lib/project-orchestrator.ts`
- `packages/server/src/routes/project-routes.ts`
- `scripts/agent-workbench.ts`
