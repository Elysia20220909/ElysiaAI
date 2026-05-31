# Repository Snapshot Backup

要約: GitHub Actions で重要なリポジトリ設定ファイルを定期スナップショットし、変更がある場合だけ別のプライベートリポジトリへ保存します。

## What It Captures

The snapshot is intentionally allowlisted and tracked-file only. It stores files under:

```text
repositories/<owner>/<repo>/files/...
```

This keeps copied `.github/workflows/**` files away from the backup repository root, so they do not run as workflows in the snapshot repository.

Default captured paths include:

- `.github/workflows/**`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/**`
- `.gitleaks.toml`
- `AGENTS.md`
- `package.json`, `bun.lock`, `bun.lockb`
- `prisma/schema.prisma`
- CI and security docs under `docs/`
- `.env.example` and `config/.env.example`

The script refuses common secret material such as `.env`, private keys, and certificate bundles even if they are tracked accidentally.

## Setup

1. Create a private repository for snapshots, for example `OWNER/repository-snapshots`.
2. In the source repository, set repository variable:

```text
SNAPSHOT_TARGET_REPOSITORY=OWNER/repository-snapshots
```

3. Prefer a GitHub App installed only on the private snapshot repository:

```text
SNAPSHOT_APP_ID=<app id>
SNAPSHOT_APP_PRIVATE_KEY=<private key pem>
```

The workflow creates a short-lived installation token with `contents: write` scoped to the snapshot repository.

Fallback: set `SNAPSHOT_REPOSITORY_TOKEN` to a fine-grained PAT scoped only to the snapshot repository with Contents read/write.

## Operation

The workflow runs weekly and can also be started manually:

```text
Actions > Repository snapshot > Run workflow
```

The workflow:

1. Clones the source repository using the built-in `GITHUB_TOKEN` with `contents: read`.
2. Builds a tracked-file snapshot from the allowlist.
3. Clones the private snapshot repository using a GitHub App token or fine-grained PAT.
4. Copies the snapshot under `repositories/<owner>/<repo>/`.
5. Checks `git status --porcelain` and commits only when the snapshot changed.

## Notes

This workflow snapshots repository files, not GitHub UI settings such as branch protection, rulesets, environments, or Actions settings. Those require separate REST API reads and broader administrative permissions, so they should be added as a deliberate second stage.
