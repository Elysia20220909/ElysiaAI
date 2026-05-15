# Codex Commit-Only Mode

ElysiaAI uses Codex in commit-only mode for routine maintenance and documentation work.

## Purpose

Codex should behave like a normal contributor that leaves clear, reviewable Git history.

Do not create broad integration pull requests.
Do not combine unrelated branches into one PR.
Do not silently merge scattered work into a single umbrella change.

## Branch Policy

Use one dedicated branch per focused task.

Recommended branch naming:

- `codex/<short-purpose>`
- `codex/fix-<short-topic>`
- `codex/docs-<short-topic>`
- `codex/chore-<short-topic>`

Branch names should be readable, calm, and specific.
Avoid vague names such as `update`, `fixes`, `final`, `work`, or `misc`.

## Commit Policy

Use ordinary Git commits.

- One task should produce one focused branch.
- One logical change should produce one focused commit.
- Keep unrelated changes separate.
- Write clear Conventional Commit messages.
- Prefer small, traceable commits over bundled changes.

Examples:

```text
docs: update Codex working rules
fix: correct workflow dependency registry
chore: organize maintenance notes
feat: add mobile layout guidance
```

## Pull Request Policy

For now, do not open pull requests automatically.

PRs should stay paused unless explicitly requested.
When PRs are requested later, create one PR per branch and one branch per task.

Forbidden for Codex:

- umbrella PRs
- integration PRs
- multi-branch summary PRs
- unrelated change bundles
- automatic PR creation without instruction

## Existing Branch Cleanup Policy

When branches are scattered, Codex should first report:

1. branch name
2. purpose if detectable
3. difference from `master`
4. latest commit
5. recommended action

Codex must not delete, merge, squash, or rebase branches without explicit instruction.

## ElysiaAI Operating Rule

Default behavior:

```text
branch -> focused commit -> stop
```

No automatic PR.
No integration PR.
No bundled cleanup.
No silent merge into `master`.
