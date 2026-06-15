# Demo Recording Runbook

## 要約

このRunbookは、Beta 0.1向けの3分デモ動画を撮るための実行手順です。

狙いは、派手な演出ではなく、ElysiaAIがローカルで起動し、考え、探し、覚え、守るところまでを静かに見せることです。

- Tracking issue: #106

## 収録前チェック

- `ollama serve` が起動している
- `ollama pull llama3.2` が完了している
- `bun tauri dev` でTauriウィンドウが開いている
- GitHub Actionsの最新 `master` がsuccessである
- Dependabot alert #7はopenのままで、Issue #104で追跡されている
- 画面にSecrets / 個人トークン / private URLが映らない
- 通知をオフにする
- Tauriウィンドウを1280x800以上で表示する
- 可能なら1920x1080で収録する

## 推奨収録方法

macOSではQuickTime PlayerかOBSを使う。

- QuickTime Player: 手早く撮る場合
- OBS: 音声と画面サイズを安定させたい場合

Windowsで撮る場合は、OBSまたはXbox Game Barを使う。

## 3分構成

### 導入

表示するもの:

- Tauriウィンドウ
- MVP readiness
- Ollama / RAG / Memory / Securityの状態

話すこと:

> ElysiaAIはクラウドのAIチャットではなく、自分のPCで動くLocal First AI OSです。今日はMVPとして、チャット、検索、RAG、記憶、Security Agentが一本につながった状態を見せます。

### Ollamaチャット

入力:

```text
Ollama RAG MVP の準備状況を要約して。
```

見せるもの:

- `mode: local-ollama`
- ローカル応答
- RAG Sources

話すこと:

> ここではOllamaへ直接つないでいます。MVPでは、Bun / ElysiaからローカルLLMへ届く細い導線を先に通しました。

### RAGとファイル検索

入力:

```text
毎日使うファイル探し
```

見せるもの:

- 日本語検索の結果
- ファイルパス
- スニペット
- RAG Sources

話すこと:

> ElysiaAIは、ただ会話するだけではありません。ローカルの文書を読んで、必要な文脈を引いてから答えます。

### Memory

入力:

```text
今の結論を次回のMVP作業メモとして覚えて。
```

見せるもの:

- Memoryに記録が増える
- 1件削除
- セッションクリア導線

話すこと:

> MVP段階のメモリーは、まず小さく、見える形で保存します。覚えるだけでなく、消せることも大切です。

### Security Agent

見せるもの:

- Secrets
- GitHub Actions
- Dependencies
- Logs
- 最新Actions履歴

話すこと:

> ElysiaAIでは、セキュリティは後付けではありません。Secrets検出、Actions、依存関係、ログ異常をひとつの窓で見られるようにしました。

### 結び

話すこと:

> ElysiaAIのMVPは、AIチャットを作ることではありません。自分のPCの中で、会話、検索、記憶、監査が静かにつながることです。ここからAgentとHome Compute Meshへ伸ばしていきます。

## 撮影後チェック

- 3分前後に収まっている
- 音声が聞き取れる
- `mode: local-ollama` が見える
- RAG Sourcesが見える
- Memoryの追加 / 削除が見える
- Security Agentが見える
- Secretsやprivate tokenが映っていない
- 失敗画面を隠していない
- Beta 0.1のKnown IssuesにDependabot alert #7を残している

## ファイル名

```text
elysiaai-beta-0.1-demo-YYYYMMDD.mp4
```

## 公開前メモ

READMEへ動画リンクを貼る前に、以下を確認する。

- 動画の置き場所
- 公開範囲
- Known Issues
- Beta 0.1のGo / No-Go判定
