# Tauri Distribution Runbook

ElysiaAI のデスクトップ版は、ローカルファーストな Web cockpit を Tauri 2 の薄いネイティブシェルで包む方針です。配布作業は、まず再現性と秘密情報の保護を優先し、署名や公開は各 OS での手動確認後に進めます。

## 目的

- Windows、macOS、Linux のデスクトップ配布手順を固定する。
- `public/`、`src-tauri/`、ローカル設定の境界を明確にする。
- `.env`、ログ、アップロード、ローカルキャッシュを成果物に混ぜない。

## 前提

- Bun 依存関係がインストール済み。
- Rust stable と Tauri 2 の OS 別依存がインストール済み。
- `src-tauri/tauri.conf.json` の `identifier`、`productName`、`version` をリリース内容に合わせて確認済み。
- 本番用の秘密情報は `.env` ではなく OS の安全な設定、または配布後の初回セットアップで注入する。

## ローカル確認

```powershell
bun run typecheck
bun run lint
bun run test
bun run security:audit
```

Tauri 側:

```powershell
Push-Location src-tauri
cargo fmt --check
cargo check
Pop-Location
```

## 開発起動

```powershell
bun run dev:lite
bun run desktop
```

確認ポイント:

- `http://localhost:3000/stark-ops.html` が開ける。
- Tauri ウィンドウから Local Ops、Native Lite、Security Center に遷移できる。
- 外部ネットワークやクラウド API を暗黙に呼ばない。

## パッケージ作成

```powershell
bun tauri build
```

成果物の候補:

- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/deb/` または `appimage/`

## リリース前チェック

- バンドル内に `.env`、`logs/`、`uploads/`、`data/` の個人データが含まれていない。
- `src-tauri/target/release/bundle/` の成果物だけを公開対象にする。
- Windows SmartScreen、macOS Gatekeeper、Linux 権限の注意事項をリリースノートに明記する。
- 初回起動時のローカルサーバー起動手順を README と一致させる。

## 署名と公開

署名は OS ごとの証明書管理が必要です。証明書やパスワードを GitHub Actions のログに出さず、GitHub Secrets または手元の安全なストアに閉じ込めます。

最初の公開は draft release を推奨します。実機で起動、アンインストール、再インストール、アップデートの4点を確認してから ready にします。
