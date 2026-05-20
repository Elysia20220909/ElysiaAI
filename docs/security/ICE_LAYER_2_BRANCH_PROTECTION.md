# ❄️ ICE Layer 2: Branch Protection Policy

This policy hardens the default branch (`master`) by requiring all production changes to pass through reviewed pull requests and automated security checks.

## Required GitHub Branch Protection Settings

Apply this rule to:

```text
master
```

Recommended matching pattern if using rulesets:

```text
master
main
dev
```

## Required Protections

Enable the following settings in GitHub:

- Require a pull request before merging
- Require approvals before merging: `1`
- Dismiss stale pull request approvals when new commits are pushed
- Require review from Code Owners, once `CODEOWNERS` is introduced
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Require signed commits, if all local developer machines are ready
- Do not allow bypassing the above settings
- Restrict who can push to matching branches
- Block force pushes
- Block deletions

## Required Status Checks

Use the exact check names shown in the PR checks list after the workflows run. Expected checks include:

```text
CodeQL Analysis
Gitleaks Secret Detection
🔍 セキュリティ監査 (Audit)
🧪 統合テスト (Tests)
```

If GitHub shows matrix-specific names, require both CodeQL matrix entries:

```text
CodeQL Analysis (javascript-typescript)
CodeQL Analysis (python)
```

## Recommended Rule Order

1. Protect `master` first.
2. Add required status checks after the new CodeQL and Gitleaks workflows have run once.
3. Turn on required PR review.
4. Turn on stale approval dismissal.
5. Disable force pushes and branch deletion.
6. Add `CODEOWNERS` in ICE Layer 3 or later.

## Manual Setup Path

Open:

```text
Repository → Settings → Branches → Add branch protection rule
```

Then set:

```text
Branch name pattern: master
```

For GitHub Rulesets:

```text
Repository → Settings → Rules → Rulesets → New branch ruleset
```

## Acceptance Criteria

This layer is complete when:

- Direct pushes to `master` are blocked.
- Pull requests are required.
- At least one approval is required.
- CodeQL must pass.
- Gitleaks must pass.
- Existing security and test workflows must pass.
- Force-push and branch deletion are blocked.

## Notes

Branch Protection is a repository setting, not a normal file-based code change. This document exists so the exact intended security posture is versioned, reviewable, and auditable inside the repository.
