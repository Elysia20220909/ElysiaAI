# Branch Cleanup Ledger

This ledger is the next cleanup stage after `docs/BRANCH_ATLAS.md`.

It records the intended disposition of each visible branch before any destructive cleanup is attempted.

## Current Policy

Do not delete, force-push, squash, or merge branches blindly.

Use this sequence:

```text
list -> classify -> preserve important work -> recreate from master if needed -> then delete stale branches only with explicit instruction
```

## Current PR State

```text
open PRs: 0
```

The previous stale PRs were closed without merging:

| PR | Branch | Result | Notes |
|---:|---|---|---|
| #93 | `codex/remove-legacy-web-suit-os` | closed, not merged | Large legacy-removal branch. Recreate from latest `master` if still needed. |
| #94 | `codex/enforce-suit-command-confirmation` | closed, not merged | Focused change, but stale. Recreate from latest `master` if still needed. |

## Branch Disposition Table

| Branch | Group | Disposition | Action |
|---|---|---|---|
| `master` | mainline | keep | Canonical default branch. |
| `nexus` | long-lived | review | Determine whether this is active architecture work or stale experiment. |
| `feature/streaming-threejs` | feature | review | Keep if still active; otherwise summarize before archive. |
| `backup-before-rollback` | safety | keep-temporarily | Keep until repository recovery confidence is high. |
| `alert-autofix-2` | automation | archive-candidate | Inspect before deletion. |
| `alert-autofix-23` | automation | archive-candidate | Inspect before deletion. |
| `codex/branch-atlas` | docs/policy | keep-or-merge-later | Contains branch atlas documentation. |
| `codex/branch-cleanup-ledger` | docs/policy | current | Contains this cleanup ledger. |
| `codex/moonlit-commit-only` | docs/policy | keep-or-merge-later | Contains Codex commit-only workflow policy. |
| `codex/restore-normal-git-workflow` | docs/policy | keep-or-merge-later | Contains normal Git workflow policy. |
| `codex/integrate-all-branches` | integration | quarantine | Do not merge. Use only as reference. |
| `codex/remove-legacy-web-suit-os` | stale PR branch | recreate-if-needed | PR #93 closed. Do not merge stale branch. |
| `codex/enforce-suit-command-confirmation` | stale PR branch | recreate-if-needed | PR #94 closed. Recreate from latest `master` if still needed. |
| `codex/pr88-reconcile-20260511` | historical reconciliation | review | Inspect before any action. |
| `codex/update-historical-python-deps` | dependency | review | Dependency changes should remain isolated. |
| `codex/quiet-garden-hygiene` | maintenance | review | Inspect scope before merge/archive. |
| `codex/aurora-delivery-protocol` | feature/docs | review | Inspect scope before action. |
| `codex/circuit-moon-primer` | docs/concept | review | Inspect scope before action. |
| `codex/elysia-silver-thread` | feature/docs | review | Inspect scope before action. |
| `codex/mark85-golden-atelier` | feature/docs | review | Inspect scope before action. |
| `codex/xiv-lantern-keeper` | feature/docs | review | Inspect scope before action. |

## Quarantine Rule

The following branch is explicitly quarantined:

```text
codex/integrate-all-branches
```

Reason:

- observed as a very broad integration branch
- many commits ahead of `master`
- also behind current `master`
- touches many unrelated domains

Required treatment:

```text
reference only -> extract useful work into new focused branches -> never merge directly
```

## Recreate Rule

Stale PR branches should not be rebased casually.

Preferred pattern:

```text
master
 -> codex/fix-<specific-topic>
 -> one focused change
 -> one focused commit
 -> stop
```

## Next Safe Actions

1. Inspect each `review` branch one by one.
2. Create a short branch note for each branch that still matters.
3. Recreate any valuable stale work from latest `master`.
4. Keep backup branch until recovery confidence is high.
5. Only then delete/archive branches with explicit instruction.

## No-Go Actions

Do not do these without explicit instruction:

- delete `backup-before-rollback`
- merge `codex/integrate-all-branches`
- force-push shared branches
- squash unrelated branches together
- reopen #93 or #94 as-is
- create umbrella PRs

## Current Desired Shape

```text
master
  codex/branch-atlas
  codex/branch-cleanup-ledger
  codex/moonlit-commit-only
  codex/restore-normal-git-workflow
  feature/streaming-threejs
```

Everything else should be reviewed, recreated, or archived later.
