# Normal Git Workflow

ElysiaAI is returning to a normal Git workflow.

## Core Rule

Use Git like a normal software project.

```text
one task
  -> one branch
  -> one focused commit series
  -> optional review
  -> merge when ready
```

## Branch Rules

Branches should have a single purpose.

Recommended examples:

- `codex/fix-auth-session`
- `codex/docs-apple-ui`
- `codex/chore-actions-cleanup`
- `feature/streaming-threejs`

Avoid:

- vague branch names
- mixed-purpose branches
- umbrella integration branches
- hidden experimental bundles

## Commit Rules

Commits should:

- explain intent clearly
- stay focused on one logical change
- avoid unrelated file bundles
- remain readable in history

Preferred commit styles:

```text
feat: add local inference scheduler
fix: correct JWT refresh handling
chore: clean workflow cache logic
docs: update architecture atlas
```

## Pull Request Rules

Pull requests are optional.

Do not automatically generate PRs.
Do not create integration PRs combining unrelated branches.
Do not create summary PRs for scattered work.

If a PR is needed:

```text
one branch -> one PR
```

## Codex Role

Codex acts as a focused commit worker.

Default behavior:

```text
branch
 -> focused change
 -> commit
 -> stop
```

Codex must not:

- silently merge into master
- rewrite unrelated history
- combine unrelated branches
- generate umbrella cleanup work

## Repository Direction

ElysiaAI should favor:

- readable history
- stable branch structure
- small reversible commits
- calm maintenance flow
- traceable architecture evolution

The repository should feel like a maintained engineering notebook, not a temporary AI scratchpad.
