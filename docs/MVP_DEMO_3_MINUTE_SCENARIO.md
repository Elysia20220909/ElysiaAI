# ElysiaAI MVP Demo Scenario

## 要約

このデモは、ElysiaAIを"ローカルで毎日使えるAI OS"として見せるための3分構成です。

派手な機能紹介ではなく、起動、質問、検索、RAG、メモリー、Security Gateの順に、一本の生活導線として見せます。

## 事前準備

- Ollamaを起動しておく
- `OLLAMA_MODEL` に合わせたモデルをpullしておく
- `bun run dev:lite` でローカルスタックを起動しておく
- WindowsはVisual Studio Build Tools導入後にTauriで `bun tauri dev` を起動しておく
- GitHub Actions / Gitleaks / CodeQLの画面をすぐ開ける状態にしておく

## 画面の流れ

### オープニング

- TauriでElysiaAI Local Cockpitを表示する
- 左側のMVPの現在地を見せる
- Ollama / RAG / 記憶 / Tauri / Securityの状態を軽く確認する

話すこと:

> ElysiaAIはクラウドのAIチャットではなく、自分のPCで動くLocal First AI OSです。今日はそのMVPとして、チャット、検索、RAG、記憶、Security Agentが一本につながった状態を見せます。

### ローカルチャット

- 入力欄に質問する

```text
Ollama RAG MVP の準備状況を要約して。
```

- `mode: local-ollama` を見せる
- RAG Sourcesに参照元が出ることを見せる
- 返答がローカルOllamaから返ることを説明する

話すこと:

> ここではOllamaに直接つないでいます。FastAPIも残していますが、MVPではBun / ElysiaからローカルLLMへ直接届く細い導線を先に通しました。

### RAGとファイル検索

- ローカルファイルで検索する

```text
毎日使うファイル探し
```

- 検索結果のファイルパスとスニペットを見せる
- チャットのRAG Sourcesに参照元が出ることを見せる

話すこと:

> ElysiaAIはただ会話するだけではなく、ローカルの文書を読んで、必要な文脈を引いてから答えます。日本語の自然な言い回しでも拾えるよう、MVPでは検索語の補完を小さく入れています。

### メモリー

- 続けて質問する

```text
今の結論を次回のMVP作業メモとして覚えて。
```

- 左側のMemoryに記録が増えることを見せる
- 不要な記憶を1件削除できることを見せる
- 必要ならセッション単位でClearできることを見せる

話すこと:

> MVP段階のメモリーは、まず小さく、見える形で保存します。覚えるだけでなく、消せることも大切です。毎日使う道具には、手入れの導線が必要です。

### Security Agent

- 右側のSecurity AgentをScanする
- Secrets / GitHub Actions / Dependencies / Logsの要約を見る
- GitHub Actionsの最新実行履歴カードを見せる
- GitHub ActionsのCI画面も補足として見せる
- `MVP_READINESS.md` のSecurity Gate欄を見せる

話すこと:

> ElysiaAIはローカルファーストなので、セキュリティは後付けではありません。Secrets検出、Actionsの衛生状態、依存関係、ログ異常をひとつの窓で見られるようにしました。まだ試作ですが、ここがSecurity Agentの最初の心臓部です。

## クロージング

話すこと:

> ElysiaAIのMVPは、AIチャットを作ることではありません。自分のPCの中で、会話、検索、記憶、監査が静かにつながることです。ここからAgentとHome Compute Meshへ伸ばしていきます。

## 失敗時の見せ方

- Ollamaが落ちている場合は、ReadinessのOllamaがblockedになることを見せる
- UIのやさしい復帰案内を読み上げる
- その場で `ollama serve` を起動する
- モデル未取得の場合は `ollama pull llama3.2` を実行する
- CIが失敗している場合は、失敗を隠さず、`MVP_READINESS.md` の未完了項目として見せる

## デモの成功条件

- Tauri UIが起動している
- Readinessが表示される
- チャットがOllamaへ届く
- ローカル検索結果が表示される
- RAG Sourcesが表示される
- Memoryが増える
- Memoryを削除またはクリアできる
- Security AgentのScan結果が表示される
- Security Gateの状態を説明できる
