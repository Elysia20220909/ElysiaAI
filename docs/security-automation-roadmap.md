# Security Automation Roadmap

This repository uses a small set of GitHub-native controls to reduce routine
security drift:

- Dependabot version updates for GitHub Actions, npm, pip, and Cargo.
- CodeQL weekly scans for JavaScript/TypeScript and Python with
  `security-and-quality` queries.
- Secret scanning alert polling with optional Slack forwarding via the
  `SECRET_ALERT_WEBHOOK` repository secret.
- CODEOWNERS-backed review routing for security-sensitive paths.
- A pull request template that requires security, verification, and rollback
  notes before merge.

## Required GitHub Settings

Enable these in GitHub after this branch is merged:

- Secret scanning
- Push protection
- Require pull request before merging
- Require approval from CODEOWNERS
- Require status checks for CodeQL and CI
- Require signed commits where practical
- Disable force pushes on protected branches

## Secret Alert Notification

The workflow at `.github/workflows/secret-scanning-alerts.yml` polls the GitHub
Secret Scanning REST API every six hours. Configure a Slack-compatible incoming
webhook as the repository secret `SECRET_ALERT_WEBHOOK` to forward open alert
summaries.

GitHub's `secret_scanning_alert` event is a webhook event, but it is not a
standard GitHub Actions workflow trigger. For real-time delivery, use a GitHub
App or an external webhook receiver. The polling workflow is the lightweight
in-repository fallback.

## Rollback Playbook

Revert the most recent merge while preserving history:

```bash
git log --oneline --merges -n 5
git revert -m 1 <MERGE_SHA>
git push origin master
```

Prepare a deployment rollback branch from a known-good tag:

```bash
git checkout -B deploy refs/tags/vX.Y.Z
git push -f origin deploy
```

Create a rollback pull request with GitHub CLI:

```bash
gh pr checkout <PR_NUMBER>
git revert -m 1 $(git rev-parse HEAD)
git push origin HEAD:revert/<PR_NUMBER>
gh pr create --fill --title "revert: PR #<PR_NUMBER>" --label "rollback"
```

## Weekly Review

Spend 15 minutes each week on:

- Audit log review.
- Personal access token and SSH key inventory.
- GitHub Actions permission review.
- Self-hosted runner isolation checks, if runners are introduced.
- Repository secret rotation and removal of unused secrets.
