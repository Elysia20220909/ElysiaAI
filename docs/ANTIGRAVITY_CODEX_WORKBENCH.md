# Antigravity / Codex Workbench

This document describes the local ElysiaAI coordination layer for using an
Antigravity-style mission-control workflow together with a Codex-style
implementation workflow.

The implementation is intentionally plan-only. ElysiaAI does not launch an IDE,
start Codex, run Antigravity, open browsers, push code, deploy, or execute
external agent tools from the API.

## Purpose

Use this workbench when a task benefits from two different agent postures:

- Antigravity-style mission control: task lists, implementation plans, browser
  verification notes, screenshots, and walkthrough artifacts.
- Codex-style implementation: repo-aware code edits, targeted tests, typecheck,
  lint, and concise change summaries.
- Human review: approval for release, deployment, destructive commands, broad
  refactors, dependency changes, and secrets handling.
- Local policy: deny unsafe requests before they become handoffs.

## Runtime Model

| Runtime | Role | Authority | Best Fit |
| --- | --- | --- | --- |
| `antigravity` | Mission control | Plan only | Browser validation, artifacts, multi-step planning |
| `codex` | Implementation | Confirm required | Code edits, tests, diffs, verification |
| `human_review` | Approval | Confirm required | Scope, release, secret handling, final adoption |
| `local_policy` | Safety gate | Deny only | Unsafe command blocking and handoff shaping |

## API

Protected by the existing neural session boundary:

- `GET /api/agents/workbench/status`
  - Returns the workbench profile, runtime capabilities, command policy, and
    hard rules.
- `POST /api/agents/workbench/plan`
  - Body:

```json
{
  "request": "Implement the UI and verify it with screenshots",
  "mode": "review_driven"
}
```

`mode` is optional and may be:

- `review_driven`
- `balanced`
- `codex_first`
- `antigravity_first`

## CLI

```powershell
bun run agents -- status
bun run agents -- status --json
bun run agents -- plan --request "Implement a responsive UI and verify it"
bun run agents -- plan --request "Prepare a release" --mode codex_first
```

## Safety Rules

- The server returns plans and handoff prompts only.
- Terminal execution, browser JavaScript, dependency installation, deployment,
  publishing, and push actions require human review.
- Requests involving broad deletion, drive wipes, `git reset --hard`, force
  push, credential harvesting, or secret upload are denied.
- Secrets remain in environment variables and are not logged, printed, copied,
  or committed.
- External tools must respect `AGENTS.md` and the local-first assumptions of
  ElysiaAI.

## Recommended Flow

1. Call `planAgentWorkbenchTask` or `POST /api/agents/workbench/plan`.
2. Review the classification, decision, controls, and blocked capabilities.
3. Use the generated Antigravity handoff for planning and browser evidence when
   the task has UI or workflow complexity.
4. Use the generated Codex handoff for scoped implementation and checks.
5. Keep the final review with the operator before merge, push, deploy, or broad
   cleanup.

## Implementation Files

- `packages/server/src/lib/agent-workbench.ts`
- `packages/server/src/lib/agent-workbench.test.ts`
- `packages/server/src/routes/neural-system-routes.ts`
- `scripts/agent-workbench.ts`
