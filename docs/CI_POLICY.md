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

Pull request security scanners that inspect PR commit metadata may also use:

```yaml
permissions:
  contents: read
  pull-requests: read
```

Release workflows may use:

```yaml
permissions:
  contents: write
```

## Action pinning

Actions should be pinned to full commit SHA values. Version comments may be used for readability.

Example:

```yaml
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
```

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

## Runner isolation

Self-hosted runners are trusted execution zones. Pull request code must stay on
GitHub-hosted runners and must not receive privileged secrets.

Required split:

- `pull_request`: GitHub-hosted, read-only, no secrets except `GITHUB_TOKEN`.
- `push`, `schedule`, `workflow_dispatch`, and release tags: trusted workflows.

Self-hosted jobs must live in trusted workflows and use an ICE runner label. See
`docs/security/ICE_RUNNER_POLICY.md`.

## Review rule

CI changes must include a short verification note describing what workflow was changed, what risk was reduced, and what follow-up remains.
