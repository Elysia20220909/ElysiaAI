# Antigravity / Codex Workbench

This document describes the local ElysiaAI coordination layer for using an
Antigravity-style mission-control workflow together with a Codex-style
implementation workflow.

Language editions:

- Japanese: `docs/ANTIGRAVITY_CODEX_WORKBENCH.ja.md`
- US English: `docs/ANTIGRAVITY_CODEX_WORKBENCH.en-US.md`

External IDE and Codex launch are operator-preapproved local actions. The API
returns launch intent and handoff data; the local CLI may launch installed
tools. Push, deploy, destructive filesystem operations, and secret handling
still require stronger review or are denied.

## Purpose

Use this workbench when a task benefits from two different agent postures:

- Antigravity-style mission control: task lists, implementation plans, browser
  verification notes, screenshots, and walkthrough artifacts.
- Codex-style implementation: repo-aware code edits, targeted tests, typecheck,
  lint, and concise change summaries.
- Human review: approval for release, deployment, destructive commands, broad
  refactors, dependency changes, and secrets handling.
- Local policy: deny unsafe requests before they become handoffs.
- Local launch: open approved local Codex or IDE surfaces without passing
  secrets or destructive commands.

## Runtime Model

| Runtime | Role | Authority | Best Fit |
| --- | --- | --- | --- |
| `antigravity` | Mission control | Plan only | Browser validation, artifacts, multi-step planning |
| `codex` | Implementation | Confirm required | Code edits, tests, diffs, verification |
| `human_review` | Approval | Confirm required | Scope, release, secret handling, final adoption |
| `local_policy` | Safety gate | Deny only | Unsafe command blocking and handoff shaping |

## Launch Policy

- Codex and external IDE launch are preapproved for local workbench use.
- Launch only installed local tools such as `codex`, `agy`, or an explicitly
  configured executable path.
- Do not pass secrets, tokens, destructive shell commands, or production release
  commands as launch arguments.
- The server API does not push, deploy, or perform destructive work.
- The CLI can launch a local target:

```powershell
bun run agents -- launch --target codex
bun run agents -- launch --target antigravity
```

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
bun run agents -- launch --target codex --request "Implement a small patch"
```

## Safety Rules

- The server returns plans, launch intent, and handoff prompts.
- Local CLI launch is allowed for operator-preapproved Codex or IDE surfaces.
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
