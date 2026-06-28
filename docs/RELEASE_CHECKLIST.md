# ElysiaAI Release Checklist

Use this checklist before creating a `v*` tag release.

## Before tagging

- Confirm the target branch is up to date.
- Confirm CI has passed on the release commit.
- Confirm no secrets are present in logs, screenshots, or artifacts.
- Confirm release notes are accurate.
- Confirm SBOM artifacts are generated or intentionally skipped.
- Confirm rollback steps are known.

## Local checks

Recommended checks:

```powershell
bun run lint
bun run test
bun run typecheck
bun run check:encoding
bun run check:git-hygiene
bun run desktop:check
bun run security:glassworm -- --ci
```

For Python changes:

```powershell
python -m pytest tests/python tests/test_kernel.py
```

For Rust shield-agent changes:

```powershell
cargo check --manifest-path packages/shield-agent/Cargo.toml
```

For Tauri desktop distribution readiness:

```powershell
bun run desktop:check
cargo check --manifest-path src-tauri/Cargo.toml
```

Run `bun run desktop:build` only after human release review. A successful local
bundle is not the same as approval to publish, sign, notarize, or upload.

## Tauri desktop bundle

Before sharing a desktop candidate:

- Review `docs/TAURI_DISTRIBUTION_RUNBOOK.md`.
- Confirm `src-tauri/tauri.conf.json` product name, version, identifier, icons,
  resources, and CSP.
- Confirm `docs/THIRD_PARTY_NOTICES.md` covers bundled third-party assets and
  runtime dependencies.
- Record whether Windows signing, macOS notarization, and Tauri updater are
  enabled or intentionally skipped.
- Add unresolved desktop risks to release notes Known Issues.
- Generate checksums for every installer or app bundle that leaves the machine.

## Tagging

Use semantic tags:

```text
v1.3.1
v1.4.0
```

Push the tag only after the release commit is reviewed.

## Artifacts

Release artifacts should include:

- Release notes
- Release notes SHA-256 digest
- SBOM if generated
- Installer or desktop bundles when available

## Rollback

If a release is bad:

1. Mark the GitHub Release as draft or prerelease if needed.
2. Identify the last known good tag.
3. Create a fix branch from the last known good state or the broken release branch.
4. Open a hotfix PR.
5. Release a new patch tag after verification.

Do not rewrite published tags unless the repository owner explicitly decides to do so.

For large production release days, review:

- `docs/PRODUCTION_DEPLOY_DAY_PLAYBOOK_2026-07-21.md`
- `docs/EMERGENCY_ROLLBACK_RUNBOOK.md`
- `docs/KUBERNETES_BACKUP_RECOVERY_STRATEGY.md` when using Kubernetes
- `docs/OBSERVABILITY_QUICKSTART_2026.md`
