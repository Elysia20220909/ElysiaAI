# Git Governance Guide

This document consolidates the branch cleanup and normal Git workflow direction for ElysiaAI.

## Purpose

ElysiaAI should use clear, ordinary Git history.

The desired shape is:

```text
one task -> one branch -> focused commit -> stop
```

Pull requests are optional and should only be opened intentionally.

## Current Repository Direction

Use `master` as the canonical base branch.

Avoid using old branches as merge sources unless their scope is small and current.

Prefer recreating useful work from the latest `master`.

## Hard Rules

Do not:

- create umbrella PRs
- create integration PRs
- merge `codex/integrate-all-branches`
- silently merge into `master`
- combine unrelated changes
- delete backup branches without explicit instruction
- reopen stale PRs as-is

## Branch Categories

### Keep

Branches that represent current governance, policy, or active work.

Examples:

```text
master
codex/branch-atlas
codex/branch-cleanup-ledger
codex/recreation-prep
codex/docs-git-governance
feature/streaming-threejs
```

### Review

Branches that may contain useful work but need inspection.

Examples:

```text
nexus
codex/aurora-delivery-protocol
codex/circuit-moon-primer
codex/elysia-silver-thread
codex/mark85-golden-atelier
codex/xiv-lantern-keeper
codex/update-historical-python-deps
codex/quiet-garden-hygiene
```

### Recreate if needed

Branches that are stale but may contain one useful focused change.

Examples:

```text
codex/enforce-suit-command-confirmation
codex/remove-legacy-web-suit-os
```

### Quarantine

Branches that are too broad or mixed to merge directly.

```text
codex/integrate-all-branches
```

Treatment:

```text
reference only -> extract useful pieces -> recreate from master
```

## Stage 4 Findings

### `nexus`

Observed state:

```text
status: diverged
ahead_by: 2
behind_by: 19
```

Observed scope:

- `.github/workflows/security-tests.yml`
- `docs/SECURITY.md`

Recommendation:

```text
Do not merge `nexus` directly.
Extract the security documentation separately from the workflow changes.
Review the workflow for unpinned actions before adoption.
```

### `feature/streaming-threejs`

Observed state:

```text
No common ancestor with master.
```

This branch has unrelated or disconnected history.

Recommendation:

```text
Do not merge directly.
Use as reference only.
Extract useful concepts manually into fresh branches from master.
```

Observed useful themes:

- RAG overview
- Ollama / SSE response streaming
- Alpine.js lightweight UI
- observability notes
- older package/script layout

### `codex/integrate-all-branches`

Observed state:

```text
status: diverged
ahead_by: 96
behind_by: 10
```

Observed scope includes:

- docs
- apps/web
- server
- Python
- scripts
- tests
- public assets
- tools
- GitHub Actions

Recommendation:

```text
Do not merge.
Split only useful file groups into fresh focused branches.
```

Potential extraction groups:

```text
codex/docs-ai-coding-cost-policy
codex/docs-auto-delivery-protocol
codex/chore-git-recovery-runbook
codex/chore-takumi-guard-docs
codex/feature-pwa-shell
codex/feature-saizeriya-cli
codex/chore-discord-helpers
codex/chore-server-cors-config
```

Each extraction must be reviewed before applying.

## Safe Recreation Pattern

Use this for every old branch extraction:

```text
git checkout master
git pull origin master
git checkout -b codex/<focused-topic>
# copy only one coherent topic
git add <focused files>
git commit -m "<type>: <focused message>"
git push origin codex/<focused-topic>
```

## Commit Message Examples

```text
docs: add security governance overview
fix: require confirmation before suit commands
chore: add branch cleanup ledger
docs: document streaming architecture reference
```

## Deletion Policy

Do not delete branches until:

1. the branch has been classified,
2. any useful work has been extracted or intentionally rejected,
3. recovery branches are no longer needed,
4. explicit deletion instruction is given.

## Final Shape

Target branch garden:

```text
master
  codex/docs-git-governance
  codex/fix-suit-confirmation-gate
  codex/docs-security-governance
  codex/docs-streaming-reference
  feature/streaming-threejs
```

The goal is a repository that is boring in the best way:

```text
clear branches
clear commits
clear reasons
clear rollback paths
```
