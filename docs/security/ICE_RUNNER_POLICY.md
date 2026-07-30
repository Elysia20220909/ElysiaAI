# ICE Runner Policy

This policy defines how ElysiaAI isolates GitHub Actions runners.

## Goals

- Keep untrusted pull request code away from self-hosted machines.
- Keep repository secrets away from untrusted code.
- Make runner selection explicit, reviewable, and fail-closed.
- Prefer GitHub-hosted runners unless a trusted hardware runner is required.

## Trust Zones

### Untrusted CI

Untrusted CI is any workflow execution from `pull_request`.

Rules:

- Use GitHub-hosted runners only, such as `ubuntu-latest`.
- Use `permissions: contents: read` by default.
- Use `pull-requests: read` only when a scanner needs PR commit metadata.
- Do not use repository secrets except `secrets.GITHUB_TOKEN`.
- Do not use deployment environments.
- Do not run release, signing, deployment, or state-writing steps.

### Trusted CI

Trusted CI is limited to:

- `push` to protected branches: `master`, `main`, or `dev`
- signed release tags
- `schedule`
- `workflow_dispatch` by a maintainer

Rules:

- GitHub-hosted runners are still preferred.
- Self-hosted runners require explicit ICE labels.
- Secrets may be used only in trusted workflows.
- Deployment or release jobs must use GitHub environment protection where practical.
- Workflow changes require CODEOWNERS review.

## Self-Hosted Runner Labels

Use these labels when a trusted job needs local hardware:

```text
self-hosted
ice-linux-trusted
ice-macos-trusted
ice-windows-trusted
ice-arm64-lab
```

Allowed examples:

```yaml
runs-on: [self-hosted, ice-linux-trusted]
runs-on: [self-hosted, ice-macos-trusted]
runs-on: [self-hosted, ice-windows-trusted]
runs-on: [self-hosted, ice-arm64-lab]
```

Forbidden examples:

```yaml
runs-on: self-hosted
runs-on: [self-hosted]
runs-on: [self-hosted, linux]
```

Generic labels such as `linux`, `macos`, `windows`, `gpu`, or `home-server`
are not enough. A self-hosted job must include one ICE trust label.

## Event Rules

`pull_request_target` must not be combined with self-hosted runners.

For easier review and safer fail-closed checks, do not mix `pull_request` and
self-hosted jobs in the same workflow file. Split workflows by trust zone:

- `pull_request` workflow: GitHub-hosted, read-only, no privileged secrets.
- trusted workflow: push/schedule/manual only, may use self-hosted ICE labels.

## Required Check

`ICE Runner Policy` must pass before workflow changes merge.

The checker fails closed when it finds:

- `pull_request_target` combined with `self-hosted`
- a `pull_request` workflow that references a self-hosted runner
- self-hosted runner usage without an ICE label
- non-`GITHUB_TOKEN` secrets in a `pull_request` workflow

If a workflow needs an exception, document the threat model in the PR and keep
the exception in a separate trusted workflow file.
