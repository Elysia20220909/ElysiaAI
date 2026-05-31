# ElysiaAI CI Policy

This policy explains how ElysiaAI uses CI as a review gate.

## Goals

- Catch broken builds before merge.
- Catch secret leaks before merge.
- Keep dependencies reproducible.
- Preserve useful artifacts for debugging.
- Keep local-first and privacy-first assumptions intact.

## Required branches

CI must run for:

```text
master
main
dev
```

`master` is the repository default branch and must remain covered.

## Permissions

Workflows should use the smallest permissions required.

Default:

```yaml
permissions:
  contents: read
```

Release workflows may use:

```yaml
permissions:
  contents: write
```

Privileged workflow exceptions must stay narrow:

| Workflow | Elevated permission | Guardrail |
| --- | --- | --- |
| `.github/workflows/ci-minimal.yml` | `packages: write`, `id-token: write` | Manual publish only from `main` with an explicit `publish` input. |
| `.github/workflows/release.yml` | `contents: write` | Job-only permission for GitHub Release creation on tag/manual runs. |
| `.github/workflows/runner-watchdog.yml` | `issues: write` | Scheduled self-hosted runner alerting only; runner API access uses `RUNNER_WATCHDOG_TOKEN` with repository Administration read permission. |
| `.github/workflows/repository-snapshot.yml` | External snapshot repository `contents: write` token | Built-in `GITHUB_TOKEN` remains `contents: read`; prefer a GitHub App installation token scoped only to the private snapshot repository. |
| `.github/workflows/sovereign-sentinel.yml` | `contents: write` | Job-only permission for committing monitor state files. |
| `.github/workflows/takumi-guard.yml` | `id-token: write` | Job-only OIDC permission; fork pull requests are skipped. |

All other workflow jobs should default to `contents: read` and `id-token: none`.
Use `actions/checkout` with `persist-credentials: false` unless the job must push
back to the repository.

## Action pinning

Actions should be pinned to full commit SHA values. Version comments may be used for readability.

Example:

```yaml
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
```

## CI workflow threat scan

Run the workflow poisoning scan before merging CI changes:

```bash
bun run security:ci-workflows
```

The scan blocks known Megalodon-style indicators, `pull_request_target`, and
workflow patterns that combine base64 decoding, network egress, and secret
access markers. The security baseline runs this scan with `--strict-pinning`,
so new action references must be pinned before merge.

## Repository snapshot backup

`.github/workflows/repository-snapshot.yml` records allowlisted CI and security
configuration files into a separate private snapshot repository. The copied
files are stored below `repositories/<owner>/<repo>/files/` so workflow files do
not execute in the snapshot repository. The workflow commits only when
`git status --porcelain` detects a snapshot change after sync.

Prefer `SNAPSHOT_APP_ID` and `SNAPSHOT_APP_PRIVATE_KEY` so the workflow creates
a short-lived GitHub App installation token for the snapshot repository. A
fine-grained `SNAPSHOT_REPOSITORY_TOKEN` is an acceptable fallback when scoped
only to the private snapshot repository with Contents read/write.

## Repository security settings

GitHub settings cannot be enforced from this file, but the repository should be
configured as follows:

- Enable Dependabot alerts and updates. `.github/dependabot.yml` covers npm,
  pip, GitHub Actions, and Cargo.
- Enable secret scanning, including Push Protection.
- Enable code scanning. CodeQL workflows are present for JavaScript/TypeScript
  and Python.
- Protect the default branch, currently `master`, and mirror the rule on `main`
  if both branches remain active.
- Require signed commits, one approving review, passing status checks, and no
  force pushes on protected branches.
- Keep OIDC trust rules pinned to this repository and intended refs, for example
  `repo:Elysia20220909/ElysiaAI:ref:refs/heads/main` or the equivalent `master`
  ref where production automation still uses `master`.
- Keep self-hosted runners repo-scoped, label-restricted, patched, and isolated.

## CI/CD credential review

After a workflow-poisoning alert or suspicious automation commit, do this in the
GitHub UI before trusting the pipeline again:

- Review Settings > Secrets and variables > Actions. Delete unused repository
  secrets, move environment-specific credentials into protected environments,
  and rotate every secret that could have been exposed by a workflow run.
- Review Settings > Deploy keys. Remove stale keys, keep active keys read-only
  unless a documented release workflow truly needs write access, and rotate the
  private key material outside GitHub.
- Review personal access tokens from the owning accounts. Revoke broad classic
  PATs, replace them with fine-grained tokens or GitHub Apps where possible, and
  set the shortest practical expiration.
- Review Actions run history, repository audit log entries, and workflow file
  commits for unexpected actors, bot-like names, or maintenance-style commit
  messages that do not match normal project practice.
- Enable `Require review from Code Owners` on protected branches or rulesets so
  `.github/CODEOWNERS` makes workflow changes wait for owner approval.

## Dependency installation

Bun installs should prefer frozen lockfiles when available:

```bash
if [ -f bun.lock ] || [ -f bun.lockb ]; then
  bun install --frozen-lockfile
else
  bun install
fi
```

Python installs should prefer `requirements.lock` when available and fall back to `requirements.txt`.

Rust checks should use explicit manifests:

```bash
cargo check --manifest-path packages/shield-agent/Cargo.toml
```

## Artifacts

Artifacts should have explicit retention periods.

Recommended values:

| Artifact | Retention |
| --- | ---: |
| Coverage | 14 days |
| Test reports | 30 days |
| SBOM | 90 days |
| Release notes | 90 days |

## Failing closed

Secret scans and policy checks should fail closed. Do not use `continue-on-error` for secret scanning unless the PR explains why and the behavior is temporary.

## Review rule

CI changes must include a short verification note describing what workflow was changed, what risk was reduced, and what follow-up remains.
