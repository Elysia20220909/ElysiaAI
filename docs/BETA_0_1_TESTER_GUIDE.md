# ElysiaAI Beta 0.1 Tester Guide

## 要約

このガイドは、Beta 0.1候補を3〜5人の少人数テスターへ渡すための案内です。

目的は、完成度を競うことではありません。初回起動でどこにつまずくか、毎日使う道具としてどこが光るかを、静かに集めることです。

## 対象

- WindowsまたはmacOSでローカル開発環境を触れる人
- Git、Bun、Python、Ollamaの導入に抵抗がない人
- クラウドAIチャットより、手元のPCで動くPrivate AI Cockpitに価値を感じられる人

## 事前にお願いしたいこと

- 秘密情報、APIキー、個人トークンを画面やログに出さない
- 仕事用の機密文書は、最初のテストでは使わない
- 失敗した場合は、最後に実行したコマンドとエラーメッセージを残す
- うまく動いた場合も、初回起動にかかった時間を残す

## セットアップ

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

Ollamaを起動し、推奨モデルを取得します。

```bash
ollama serve
ollama pull llama3.2
```

別ターミナルでElysiaAIを起動します。

```bash
bun tauri dev
```

ブラウザだけで試す場合は、軽量モードでも確認できます。

```bash
bun run dev:lite
```

## 確認してほしい流れ

- Tauriウィンドウまたはブラウザで画面が開く
- Readinessが表示される
- Ollamaの状態がreadyまたはavailableになる
- チャットで `mode: local-ollama` が表示される
- 日本語でファイル検索を試す
- RAG Sourcesに参照元が表示される
- Memoryへ保存し、1件削除とクリアを試す
- Security Agentを実行し、Secrets / Actions / Dependencies / Logsの状態を見る

## 試すプロンプト

```text
Ollama RAG MVP の準備状況を要約して。
```

```text
毎日使うファイル探し
```

```text
今の結論を次回のMVP作業メモとして覚えて。
```

## フィードバック項目

- OSとCPU
- 初回起動にかかった時間
- 失敗したコマンド
- 最初に迷った場所
- 毎日使いたいと思った機能
- 不要または分かりにくいと感じた機能
- Beta 0.1前に直した方がよい最低限の点

## 既知の注意点

- macOSのTauri起動は実機確認待ち
- デモ動画は収録前
- Dependabot alert #7の `glib` は上流依存リスクとしてIssue #104で追跡中
- MVP外の古いPythonスクリプトまで含めた無指定テストは失敗する場合がある

## 返信テンプレート

```text
OS:
CPU:
Bun:
Python:
Rust:
Ollama:
起動結果:
mode: local-ollama の表示:
初回起動時間:
つまずいた箇所:
よかった点:
直した方がよい点:
ログやスクリーンショット:
```

## OSセキュリティ警告のバイパス手順 (未署名・未公証ベータ版)

本ベータ版は開発途中の未署名パッケージであるため、起動時にOSのセキュリティ警告が表示されます。以下の手順で実行を許可してください。

### Windows (SmartScreen)
1. インストーラーまたは実行ファイル起動時に「WindowsによってPCが保護されました」という青い警告画面が表示されます。
2. 画面内の **「詳細情報」** リンクをクリックします。
3. 右下に表示される **「実行」** ボタンをクリックすると、通常通り起動します。

### macOS (Gatekeeper)
1. 起動時に「開発元を検証できないため開けません」というダイアログが表示された場合は、一度「キャンセル」をクリックします。
2. システム設定を開き、**「プライバシーとセキュリティ」** セクションへ移動します。
3. 画面下部に「"elysia-os"は開発元を確認できないため、使用がブロックされました」という表示があることを確認し、**「このまま開く」** ボタンをクリックします。
4. パスワードまたはTouch IDを入力して実行を許可します。
