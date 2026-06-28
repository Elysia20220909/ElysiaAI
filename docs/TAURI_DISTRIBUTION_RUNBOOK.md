# ElysiaAI Tauri Distribution Runbook

## 要約

このRunbookは、ElysiaAI Beta 0.1をTauriデスクトップ候補として配布する前の点検手順です。

目的は、勢いで配ることではありません。昔ながらの出荷前点検のように、名前、アイコン、CSP、同梱リソース、既知の未完了事項を一つずつ確認し、ユーザーの手元に静かな灯りとして届く状態へ整えることです。

## Antigravity / Codex 分担

| Runtime | 役割 | 成果物 |
| --- | --- | --- |
| Antigravity Mission Control | 配布計画、レビュー観点、スクリーンショット/デモ確認の指揮 | walkthrough、確認メモ、未解決リスク |
| Codex Implementation | チェック実行、Runbook更新、差分作成 | changed files、test/check summary |
| Human Review | 署名、配布、公開、pushの最終判断 | release approval |

禁止事項:

- `.env`、APIキー、署名鍵、証明書秘密鍵を表示・添付・コミットしない
- `git reset --hard`、force push、広範囲削除をしない
- 人間の承認なしに `bun tauri build` の成果物を配布しない
- 自動更新、署名、公証、ストア提出を「確認済み」と書かない

## 事前条件

- WindowsまたはmacOSの実機
- Bun
- Rust toolchain
- Tauri CLI依存が導入済みであること
- WindowsはWebView2 Runtime
- macOSはXcode Command Line Tools
- Ollamaを使う場合は `ollama serve` と対象モデル

## 配布前点検

まず静的な配布準備を確認します。

```powershell
bun run desktop:check
```

JSONでAntigravityやIssueへ渡す場合:

```powershell
bun run desktop:check -- --json
```

警告も失敗扱いにしたいリリース直前の確認:

```powershell
bun run desktop:check -- --strict
```

Windows候補の確認:

```powershell
bun run desktop:check:windows
```

macOS候補の確認:

```powershell
bun run desktop:check:macos
```

Linux候補の確認:

```powershell
bun run desktop:check:linux
```

Beta 0.1で既知の `glib` advisoryを許可してLinuxの状態だけ記録する場合:

```powershell
bun run desktop:check:linux:beta
```

`desktop:check:linux` は、`glib` が `0.20.0` 未満に解決される間はblockerとして止めます。`desktop:check:linux:beta` は、`docs/TAURI_GLIB_ADVISORY_2026-06-28.md` を根拠にした限定的なwaiverです。Linux配布を安全扱いにするものではありません。

主に確認するもの:

- `src-tauri/tauri.conf.json` の `productName`、`version`、`identifier`
- `frontendDist` が `public` に解決できること
- bundleが有効で、iconとresourcesの参照先が存在すること
- CSPがあり、ローカルサービスだけを許可していること
- `src-tauri/Cargo.toml` の `rust-version`
- Release notes、Release checklist、Third-party notices

## プラットフォーム別ゲート

| 対象 | コマンド | 判定 |
| --- | --- | --- |
| Windows | `bun run desktop:check:windows` | `icon.ico` と基本bundle設定を確認。署名情報がない場合は警告 |
| macOS | `bun run desktop:check:macos` | `icon.icns` と基本bundle設定を確認。公証情報がない場合は警告 |
| Linux | `bun run desktop:check:linux` | `glib >= 0.20.0` でなければblocker |
| Linux Beta記録 | `bun run desktop:check:linux:beta` | 既知advisoryを警告として記録し、配布不可リスクを残す |

GitHub ActionsのGuardian CIでも、Windows/macOS確認とLinux Beta記録を実行します。日々の開発ではWindows/macOSの配布準備を腐らせず、Linuxは上流依存の影を見える場所に置き続けます。

## Windows配布チェックリスト

- `bun run desktop:check:windows` がblockerなしで完了する
- `cargo check --manifest-path src-tauri/Cargo.toml` が通る
- `bun run desktop` で実機起動し、初回起動ウィザードとDaily Desk Briefを確認する
- Windows Defender SmartScreenの表示有無を記録する
- 署名する場合は、証明書とパスワードをGitHub Secretsまたはローカルの安全な保管場所から読み込む
- 署名しないBetaの場合は、Release NotesのKnown Issuesに未署名であることを書く
- 生成物ごとにSHA-256 checksumを作る

署名に必要な環境変数の目安:

```powershell
$env:WINDOWS_CERTIFICATE="base64-encoded-pfx"
$env:WINDOWS_CERTIFICATE_PASSWORD="***"
```

秘密鍵、証明書、パスワードはコミットしません。ログにも表示しません。

## macOS配布チェックリスト

- `bun run desktop:check:macos` がblockerなしで完了する
- macOS実機で `bun run desktop` を起動し、主要UIの崩れがないことを確認する
- 公証する場合はApple Developer Team、Apple ID、app-specific passwordを用意する
- 公証しないBetaの場合は、Gatekeeper警告の扱いをRelease Notesに書く
- `.app` または `.dmg` を作成したら、別ユーザーアカウントで起動確認する
- 生成物ごとにSHA-256 checksumを作る

公証に必要な環境変数の目安:

```bash
export APPLE_ID="developer@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID1234"
```

Appleの認証情報も、コード署名証明書と同じく秘密情報として扱います。

## Linux advisory gate

LinuxはGTK3/WebKitの依存経路で `glib 0.18.x` を解決しているため、Beta 0.1では安全な配布対象として扱いません。

通常確認:

```bash
bun run desktop:check:linux
```

このコマンドは、`src-tauri/Cargo.lock` の `glib` が `0.20.0` 未満なら失敗します。

記録目的のBeta waiver:

```bash
bun run desktop:check:linux:beta
```

このコマンドは警告として通しますが、Linux配布の承認ではありません。Release Notesには、Linux GTK3依存の既知advisoryとして残します。

## ローカル品質ゲート

変更範囲に応じて、次を実行します。

```powershell
bun run check:encoding
bun run check:deps
cargo check --manifest-path src-tauri/Cargo.toml
```

依存関係が揃っている環境では、追加で次を確認します。

```powershell
bun run typecheck
bun run test
```

## Tauri開発起動

配布前に、少なくとも一度は実機で開発起動を確認します。

```powershell
bun run desktop
```

確認すること:

- Tauriウィンドウが開く
- Setup Wizardが表示される
- Daily Desk Brief / Tester Analytics / Privacy Ledgerが初期表示で崩れない
- Ollama接続時に `mode: local-ollama` が出る
- RAG Import、Project Memory、Artifact Workbenchが主要操作として見える
- Voice toggleがメニューバーから切り替わる

## Bundle作成

bundle作成は、人間レビュー後にだけ行います。

```powershell
bun run desktop:build
```

期待される出力先:

```text
src-tauri/target/release/bundle/
```

成果物に含めるもの:

- installerまたはapp bundle
- `docs/BETA_0_1_RELEASE_NOTES.md`
- `docs/THIRD_PARTY_NOTICES.md`
- checksum
- Known Issues
- rollback手順

## 署名と更新

Beta 0.1時点では、署名、公証、自動更新は未完了の可能性があります。

配布前に決めること:

- Windows署名を行うか
- macOS notarizationを行うか
- Tauri updaterを有効化するか
- 配布先をGitHub Release draftにするか、限定テスターへ手渡しにするか

未実施の場合は、Release NotesのKnown Issuesへ明記します。

署名付きで出す場合の流れ:

- 署名/公証用の秘密情報をローカル環境またはGitHub Secretsにだけ置く
- `bun run desktop:check:windows` または `bun run desktop:check:macos` を実行する
- `bun run lint`、`bun run test`、`cargo check --manifest-path src-tauri/Cargo.toml` を実行する
- 人間レビュー後に `bun run desktop:build` を実行する
- 生成物、checksum、Release Notes、Known Issuesを同じリリース候補として保管する

署名なしで限定Betaに出す場合の流れ:

- 未署名/未公証であることをRelease Notesに明記する
- 配布先を限定テスターに絞る
- 起動時警告のスクリーンショットまたは文面をテスターガイドに添える
- checksumを必ず添える

## Antigravity Handoff

Antigravity側へ渡す短い確認文:

```text
Mission Control:
Review ElysiaAI Beta 0.1 Tauri distribution readiness.
Use docs/TAURI_DISTRIBUTION_RUNBOOK.md and bun run desktop:check output.
Plan only. Do not read secrets, push, publish, sign, notarize, or delete files.
Return walkthrough, screenshot needs, unresolved risks, and release-blocking questions.
```

## Codex Handoff

Codex側へ渡す短い実装文:

```text
Implementation:
Keep the patch scoped to Tauri distribution readiness.
Run bun run desktop:check, check:encoding, and cargo check when available.
Do not publish or push. Report missing dependencies and unresolved signing/updater risks.
```

## 残リスク

- `unsafe-inline` を含むCSPはMVP静的UIでは許容するが、ストア提出前に縮小する
- 署名、公証、自動更新は別レビューで扱う
- Dependabot alert #7の `glib` はTauri/Wry/Linux GTK3上流依存として継続監視する
- macOS実機bundle確認は、Windowsでの成功とは別に必要
