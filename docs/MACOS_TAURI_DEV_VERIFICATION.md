# macOS Tauri Dev Verification

## 要約

このRunbookは、Beta 0.1前にmacOS実機で `bun tauri dev` を確認するための手順です。

目的は、単にビルドが通ることではありません。TauriウィンドウからOllamaチャット、RAG、ファイル検索、Memory、Security Agentまで、毎日使う道具として一本につながることを確認します。

## 判定

- Status: pending
- Owner: macOS実機担当
- Tracking issue: #105
- Target command: `bun tauri dev`
- Target model: `llama3.2`
- Required result: Tauriウィンドウで `mode: local-ollama` を確認する

## 事前条件

- macOS実機で確認する
- Apple Silicon / Intel のどちらでもよい
- Xcode Command Line Toolsが入っている
- Bun / Rust / Python / Ollamaが使える
- GitHub Actionsの最新 `master` がsuccessである
- Dependabot alert #7はdismissせず、Issue #104で上流依存リスクとして追跡する

## 初回セットアップ

```bash
xcode-select --install
```

```bash
curl -fsSL https://bun.sh/install | bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Homebrewを使える場合は、Ollamaを入れる。

```bash
brew install ollama
```

Homebrewを使わない場合は、Ollama公式のmacOSアプリを入れる。

## リポジトリ準備

```bash
git clone https://github.com/Elysia20220909/ElysiaAI.git
cd ElysiaAI
git checkout master
git pull --ff-only
```

```bash
bun install --backend=copyfile --ignore-scripts
bun scripts/manage.ts setup-python
```

## Ollama確認

別ターミナルでOllamaを起動する。

```bash
ollama serve
```

モデルを取得する。

```bash
ollama pull llama3.2
ollama list
```

API応答を確認する。

```bash
curl -s http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"ELYSIA_OLLAMA_OK とだけ返して"}],"stream":false}'
```

## Tauri起動

```bash
bun tauri info
bun tauri dev
```

`bun tauri dev` は `src-tauri/tauri.conf.json` の `beforeDevCommand` により `bun run dev:lite` を起動する。FastAPIは `8000`、Bun / Elysiaは `3000`、Ollamaは `11434` を使う。

## UI確認

- Tauriウィンドウが開く
- 画面が白紙ではない
- Readinessが表示される
- Ollamaがreadyまたはavailableとして見える
- チャットで `mode: local-ollama` が表示される
- 日本語クエリでファイル検索がヒットする
- RAG Sourcesに参照元が表示される
- Memoryに追加される
- Memoryを1件削除できる
- Memoryをクリアできる
- Security AgentのScanが動く
- GitHub Actionsの最新実行履歴が表示される

## 推奨プロンプト

```text
Ollama RAG MVP の準備状況を要約して。
```

```text
毎日使うファイル探し
```

```text
今の結論を次回のMVP作業メモとして覚えて。
```

## 証跡

以下をBeta 0.1判定時に残す。

- `sw_vers`
- `uname -m`
- `bun --version`
- `rustc -V`
- `cargo -V`
- `ollama --version`
- `bun tauri info`
- `bun tauri dev` の起動ログ
- Tauriウィンドウのスクリーンショット
- `mode: local-ollama` が見えるスクリーンショット
- Security Agentの結果スクリーンショット

## 結果記録

```text
Date:
Machine:
macOS:
CPU:
Bun:
Rust:
Cargo:
Ollama:
Model:
Command:
Result:
Notes:
Evidence:
```

## よくある詰まり

### Xcode Command Line Toolsがない

```bash
xcode-select --install
```

`xcrun: error: invalid active developer path` が出る場合も、同じ対応を行う。

### Python依存が足りない

```bash
bun scripts/manage.ts setup-python
```

`.venv` が壊れている場合は、`.venv` を削除してから再実行する。

### Port 3000 / 8000 / 11434が埋まっている

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:11434 -sTCP:LISTEN
```

不要なプロセスを止めてから再実行する。

### Ollama未起動

```bash
ollama serve
```

UI側では、Ollama未起動時のやさしい復帰案内が表示されることも確認する。
