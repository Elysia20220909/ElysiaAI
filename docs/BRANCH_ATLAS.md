# Branch Atlas

This document summarizes the current ElysiaAI branch landscape and gives a safe cleanup direction.

## Summary

ElysiaAI currently has many active-looking branches. The repository should not merge or delete them blindly.

Recommended approach:

```text
inventory -> classify -> review risky branches -> keep only focused branches -> archive or close stale work
```

This document is a navigation layer only. It does not merge, delete, close, squash, or rebase anything.

## Current Branch Groups

### Mainline

| Branch | Role | Recommendation |
|---|---|---|
| `master` | Default branch | Keep as canonical mainline. |
| `nexus` | Long-lived or experimental branch | Review purpose before touching. |
| `feature/streaming-threejs` | Feature branch | Keep if still active; otherwise summarize and archive later. |

### Codex Policy / Maintenance Branches

| Branch | Role | Recommendation |
|---|---|---|
| `codex/moonlit-commit-only` | Adds Codex commit-only workflow rules. | Keep as policy branch; consider applying intentionally if still desired. |
| `codex/restore-normal-git-workflow` | Adds normal Git workflow policy. | Keep as policy branch; good candidate for normal workflow documentation. |
| `codex/quiet-garden-hygiene` | Hygiene-themed maintenance branch. | Inspect before merging. |
| `codex/update-historical-python-deps` | Dependency maintenance branch. | Review separately; dependency updates should stay isolated. |

### Codex Feature / Concept Branches

| Branch | Role | Recommendation |
|---|---|---|
| `codex/aurora-delivery-protocol` | Delivery protocol concept/work. | Inspect separately. |
| `codex/circuit-moon-primer` | Documentation or primer-style work. | Inspect separately. |
| `codex/elysia-silver-thread` | Likely focused Codex task branch. | Inspect separately. |
| `codex/mark85-golden-atelier` | Mark 85 / atelier-themed work. | Inspect separately. |
| `codex/xiv-lantern-keeper` | FFXIV-themed utility or documentation branch. | Inspect separately. |
| `codex/pr88-reconcile-20260511` | PR reconciliation branch. | Treat as historical reconciliation; inspect carefully. |

### Open PR Branches

| Branch | PR | Status | Recommendation |
|---|---:|---|---|
| `codex/enforce-suit-command-confirmation` | #94 | Open, currently not mergeable against latest `master` | Do not merge blindly. Rebase or recreate as a fresh focused branch if still needed. |
| `codex/remove-legacy-web-suit-os` | #93 | Open, currently not mergeable against latest `master` | High-deletion cleanup. Review carefully before any merge. |

### Risky / Integration Branches

| Branch | Observed state | Recommendation |
|---|---|---|
| `codex/integrate-all-branches` | Very large integration branch; observed as 96 commits ahead and 5 behind `master`, with broad changes across docs, apps, server, public assets, Python, scripts, tests, and tools. | Do not merge as-is. Treat as quarantine/reference only. Split into focused branches if useful. |

### Auto / Backup Branches

| Branch | Role | Recommendation |
|---|---|---|
| `alert-autofix-2` | Automated alert-fix branch. | Inspect or close if obsolete. |
| `alert-autofix-23` | Automated alert-fix branch. | Inspect or close if obsolete. |
| `backup-before-rollback` | Safety backup branch. | Keep until recovery confidence is high, then archive/delete only with explicit instruction. |

## Important Findings

### `codex/integrate-all-branches`

This branch is the highest-risk branch.

Observed summary:

```text
status: diverged
ahead_by: 96
behind_by: 5
```

It touches many areas, including:

- environment files
- GitHub Actions workflows
- README and docs
- web app files
- server routes and libraries
- public assets
- Python modules
- scripts
- tests
- tools

Recommendation:

```text
Do not merge `codex/integrate-all-branches` directly.
Use it only as a reference branch.
Extract useful work into new focused branches if needed.
```

### PR #93

PR #93 removes large legacy surfaces.

Observed branch:

```text
codex/remove-legacy-web-suit-os
```

Observed risk:

- many file deletions
- auth-related code removal
- suit OS related removal
- public legal/rules page removal
- rule-store removal

Recommendation:

```text
Do not merge until manually reviewed.
If still wanted, recreate as a fresh focused branch from latest master.
```

### PR #94

PR #94 changes suit command confirmation behavior.

Observed branch:

```text
codex/enforce-suit-command-confirmation
```

Observed scope:

- focused change in `packages/server/src/routes/neural-system-routes.ts`

Recommendation:

```text
Likely safer than PR #93, but still rebase or recreate from latest master before merging.
```

## Cleanup Strategy

Use a calm, reversible cleanup process.

### Phase 1: Freeze integration behavior

- Do not open new integration PRs.
- Do not merge `codex/integrate-all-branches`.
- Do not delete branches yet.
- Do not silently merge into `master`.

### Phase 2: Classify branches

Every branch should be assigned one status:

```text
keep
review
recreate
archive-candidate
close-pr-candidate
quarantine
```

### Phase 3: Recreate useful work from latest `master`

For branches that still matter:

```text
master -> new focused branch -> focused commit -> stop
```

### Phase 4: Close or archive stale work

Only after review:

- close stale PRs
- delete obsolete branches
- keep backup branches until recovery confidence is high

## Recommended Immediate Actions

1. Keep `master` as canonical.
2. Quarantine `codex/integrate-all-branches`.
3. Review PR #93 and PR #94 separately.
4. Prefer recreating needed changes from latest `master` instead of rebasing huge old branches.
5. Keep Codex in focused commit mode.

## Normal Git Workflow Reminder

```text
one task -> one branch -> one focused commit -> stop
```

No umbrella PR.
No integration PR.
No silent merge.
No branch bundle.

## Suggested Branch Naming Going Forward

Use readable purpose-first names:

```text
codex/docs-branch-atlas
codex/fix-suit-confirmation-gate
codex/chore-dependency-ledger
codex/docs-architecture-map
codex/feature-streaming-threejs
```

Avoid:

```text
codex/integrate-all-branches
codex/final
codex/update
codex/misc
codex/everything
```

## Final Recommendation

The project should keep the useful specialized branches and stop treating branches as a pile to merge.

Better shape:

```text
master
  codex/docs-branch-atlas
  codex/fix-suit-confirmation-gate
  codex/chore-actions-cleanup
  feature/streaming-threejs
```

Every branch should have one reason to exist.
