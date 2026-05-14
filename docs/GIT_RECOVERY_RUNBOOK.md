# Git History Recovery Runbook

ElysiaAI の Git 履歴を壊した、上書きした、消したかもしれない時の
最短復旧手順です。まずは深呼吸して、`origin` を触らず、証拠を凍結します。
Git はコミット SHA という指紋を掴めれば、高い確率で帰り道を見つけられます。

## Golden Rules

- `origin` への push は最後までしない。
- `git reset --hard`、`git clean -fdx`、生の `git push --force` は使わない。
- 復旧対象 SHA が見つかるまでは、可逆操作だけを行う。
- 作成した bundle、mirror、診断ログは機密扱いにする。
- 復旧後はトークン、鍵、GitHub Actions secrets をローテーションする。

## 1. Freeze Evidence

PowerShell:

```powershell
$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
git bundle create "repo-backup-$Stamp.bundle" --all
```

Bash:

```bash
git bundle create "repo-backup-$(date +%Y%m%d-%H%M).bundle" --all
```

リモート URL が安全に使える場合は、別ディレクトリへ mirror を作ります。
`origin` の中身を変更せず、参照、ブランチ、タグを丸ごと退避できます。

```powershell
$Stamp = Get-Date -Format "yyyyMMdd"
git clone --mirror <repo-url> "repo-mirror-$Stamp"
```

## 2. Find The Recovery SHA

まず、全ブランチと reflog から戻したいコミットを探します。

```powershell
git log --graph --oneline --decorate --all
git reflog --date=iso
git reflog show origin/main --date=iso
```

SHA が見えたら、中身を確認します。

```powershell
git show --stat <SHA>
git show --name-only <SHA>
```

ElysiaAI で特に見る場所:

- `package.json`、`bun.lock`、`prisma/`
- `packages/server/`、`packages/shared/`
- `python/`、`kernel/`
- `src-tauri/`
- `.github/workflows/`
- `.env.example`

## 3. Create A Rescue Branch

復旧したい SHA から、ローカルの救出用ブランチを作ります。

PowerShell:

```powershell
$Stamp = Get-Date -Format "yyyyMMdd"
git checkout -b "recovery-$Stamp" <SHA>
```

Bash:

```bash
git checkout -b "recovery-$(date +%Y%m%d)" <SHA>
```

この時点では `origin` に push しません。退避用の別リモートがある場合だけ、
復旧ブランチをそこへ保存します。

```powershell
git remote add backup <backup-url>
git push backup "recovery-$Stamp"
```

## 4. Verify Before Restore

本番ブランチへ戻す前に、最小限の確認を行います。

```powershell
git status --short --branch
git diff --stat origin/main...HEAD
bun run check:git-hygiene
bun run typecheck
```

事故内容が CI、依存、またはリリースに関わる場合は追加で実行します。

```powershell
bun run lint
bun run test
bun run security:audit
```

GitHub Actions の制約も見ます。ElysiaAI ではワークフローごとに
`actions/checkout` や `actions/setup-node` の固定方法が混在しうるため、
復旧直後に現在の状態を確認してください。

```powershell
rg -n "uses: actions/(checkout|setup-node)@" .github/workflows
```

フル SHA 固定を運用ルールにしている場合は、復旧後の別 PR で整えます。
履歴復旧の緊急操作と通常の CI hardening を同時に混ぜないのが安全です。

## 5. Restore Origin With Lease

レビューが済み、対象ブランチ名を確認したら、`--force-with-lease` で戻します。
これは誰かの直近 push をうっかり潰す事故を検知して止まれる、控えめな強制です。

```powershell
git push --force-with-lease origin "recovery-$Stamp:refs/heads/<target-branch>"
```

`--force-with-lease` が失敗したら、その場で止まります。
誰かが先に push している可能性があるため、再度 fetch して状況を確認します。

```powershell
git fetch origin --prune
git log --graph --oneline --decorate --all -n 40
```

## 6. Aftercare

復旧後は、静かな片付けまでが作業です。

- GitHub Actions secrets、PAT、deploy key、クラウドキーをローテーションする。
- branch protection を確認する。
- force push 禁止、必須レビュー、必須ステータスチェックを有効化する。
- 管理者にも保護ルールを適用する。
- bundle または mirror の定期運用を決める。
- 復旧で作った backup remote や一時資格情報を整理する。
- 関係者へ、復旧 SHA、対象ブランチ、実施時刻、実行者、検証結果を共有する。

## Emergency Short Set

PowerShell:

```powershell
$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
git bundle create "repo-backup-$Stamp.bundle" --all

$BranchStamp = Get-Date -Format "yyyyMMdd"
git checkout -b "recovery-$BranchStamp" <SHA>
git push --force-with-lease origin "recovery-$BranchStamp:refs/heads/<target-branch>"
```

Bash:

```bash
git bundle create "repo-backup-$(date +%Y%m%d-%H%M).bundle" --all
git checkout -b "recovery-$(date +%Y%m%d)" <SHA>
git push --force-with-lease origin "recovery-$(date +%Y%m%d):refs/heads/<target-branch>"
```
