# Focused Branch Recreation Prep

This document prepares the next stage after branch cleanup.

The goal is not to merge old branches directly. The goal is to recreate still-useful work from the latest `master` as small, focused branches.

## Current Rule

```text
latest master -> new focused branch -> one topic -> focused commit -> stop
```

No umbrella PR.
No integration branch.
No stale branch merge.
No silent merge into `master`.

## Inputs

This prep document builds on:

- `docs/BRANCH_ATLAS.md`
- `docs/BRANCH_CLEANUP_LEDGER.md`
- `.codex/COMMIT_ONLY_MODE.md`
- `docs/NORMAL_GIT_WORKFLOW.md`

## Current Clean State

```text
open PRs: 0
```

The old PR branches are no longer active PRs:

- `codex/remove-legacy-web-suit-os`
- `codex/enforce-suit-command-confirmation`

They should not be merged as stale branches.

## Highest Risk Branch

```text
codex/integrate-all-branches
```

Treatment:

```text
quarantine / reference only
```

Do not merge this branch directly. It is too broad and mixes unrelated work.

## Recreation Candidates

### 1. Suit confirmation gate

Old source branch:

```text
codex/enforce-suit-command-confirmation
```

Recommended new branch:

```text
codex/fix-suit-confirmation-gate
```

Scope:

- only command confirmation behavior
- only related tests or route updates
- no unrelated cleanup

Commit message:

```text
fix: require confirmation before suit commands
```

Status:

```text
ready-for-focused-recreation
```

### 2. Legacy web / suit OS cleanup

Old source branch:

```text
codex/remove-legacy-web-suit-os
```

Recommended split:

```text
codex/chore-remove-legacy-web-auth
codex/chore-remove-rule-store
codex/chore-remove-legacy-suit-os
codex/chore-remove-static-legal-pages
```

Reason:

The old branch deleted many files across unrelated areas. It should be split into reviewable slices.

Status:

```text
split-before-recreation
```

### 3. Branch policy docs

Existing branches:

```text
codex/branch-atlas
codex/branch-cleanup-ledger
codex/moonlit-commit-only
codex/restore-normal-git-workflow
codex/recreation-prep
```

Recommended action:

Keep as documentation branches until intentionally applied or merged.

Potential future combined docs branch:

```text
codex/docs-git-governance
```

Status:

```text
keep-for-now
```

### 4. Integration branch extraction

Old branch:

```text
codex/integrate-all-branches
```

Allowed extraction categories:

- documentation-only changes
- CI-only changes
- server-only changes
- Python-only changes
- web-only changes
- PWA-only changes
- tool-only changes

Forbidden:

```text
merge entire branch
```

Recommended pattern:

```text
inspect one file group -> create new branch from master -> copy only that group -> commit -> stop
```

Status:

```text
quarantine-extract-only
```

## Stage 3 Checklist

Before recreating any old work:

- [ ] Confirm latest `master` SHA.
- [ ] Choose one old branch or one file group.
- [ ] Compare old branch to `master`.
- [ ] Select only one coherent topic.
- [ ] Create a new branch from latest `master`.
- [ ] Apply only that topic.
- [ ] Commit once or in a small coherent series.
- [ ] Do not open PR automatically.
- [ ] Report branch, commit, changed files, and site/preview if available.

## Recommended Execution Order

1. Recreate the small suit confirmation gate if still needed.
2. Split legacy cleanup into separate branches only if still needed.
3. Inspect `feature/streaming-threejs` for activity.
4. Inspect `nexus` for whether it is active or stale.
5. Extract only useful pieces from `codex/integrate-all-branches`.
6. Archive/delete stale branches only after explicit instruction.

## Stop Conditions

Stop immediately if a recreation task starts touching unrelated areas.

Examples:

```text
server route fix + web UI redesign = stop and split
Python dependency update + docs rewrite = stop and split
legacy deletion + new feature = stop and split
```

## Desired End State

```text
master
  codex/docs-git-governance
  codex/fix-suit-confirmation-gate
  codex/chore-remove-legacy-web-auth
  feature/streaming-threejs
```

Only branches with a clear purpose should remain.

## Final Principle

The repository should become boring in the best way:

```text
clear branches
clear commits
clear reasons
clear rollback paths
```
