# ElysiaAI Product Priority Implementation Plan

## 要約

この計画は、ElysiaAIをMVPの先へ進めるための実装優先順位を整理したものです。

最初に狙うのは、大きな自律AIではなく、ユーザーが毎日使える静かな作業机です。文書を入れる、記憶が育つ、迷わず起動できる。この三つが揃うと、ElysiaAIはチャットアプリではなく、ローカルに根を張る知的工房になります。

## 判断軸

- ローカルファーストを崩さない
- ユーザーが自分の記憶と文書を管理できる
- 外部連携は明示的な同意と可視化を前提にする
- Agent機能はまず計画と承認から始める
- 派手な機能より、毎日触れる導線を優先する

## 最優先

### RAG Import UX

現状の不足:

- MVPの検索はワークスペース内の軽量全文検索が中心
- ファイルを入れて、解析し、チャンク化し、索引化し、参照元として使う流れがまだ弱い
- PDF、Markdown、TXT、コード断片をユーザーが自然に投入するUIがない

実装方針:

- Prismaに `KnowledgeSource`、`KnowledgeChunk`、`EmbeddingJob` を追加する
- Bun / Elysiaに `POST /api/knowledge/import`、`GET /api/knowledge/sources`、`POST /api/knowledge/reindex` を追加する
- Python側に文書抽出処理を寄せ、TXT / Markdown / PDFからテキストを抽出する
- 検索は最初からMilvusだけに寄せず、SQLite FTS5とMilvus Liteの併用にする
- UI右ペインに "Knowledge" タブを追加し、投入済み文書、処理状態、最終索引日時を表示する

現在の実装反映:

- UIからTXT / Markdown / PDFを投入できる
- 投入済み文書の一覧、ON/OFF、再索引、削除を扱える
- ローカルRAG検索は投入文書とワークスペース検索を統合して返す
- 実行系は `knowledge_sources`、`document_chunks`、`embedding_jobs` へ保存するDB-backed storeへ移行済み
- SQLite FTS5の `document_chunks_fts` と既存スコアリングを組み合わせて検索候補を返す
- `ELYSIA_KNOWLEDGE_EXTRACT_FASTAPI=1` でFastAPIの `/knowledge/extract` を使える
- `ELYSIA_KNOWLEDGE_INDEX_FASTAPI=1` でFastAPIの `/knowledge/index` からSentenceTransformers / Milvus Liteへ接続できる

主要ロジック:

- 小さな文書は全文注入、大きな文書はチャンク検索
- チャンク単位で `sourceId`、`path`、`heading`、`lineStart`、`lineEnd` を持たせる
- RAG結果は必ず出典付きで返す
- ユーザーが "この文書を使わない" を選べるようにする

検証:

- Markdownを投入して質問に出典が出る
- PDFを投入してチャンクが生成される
- 再索引して古いチャンクが残らない
- Ollama未起動でも投入状態は確認できる

期待される変化:

ユーザーは "ElysiaAIに何を読ませたか" を把握できるようになります。知識が闇鍋ではなく、手入れできる書庫になります。

### プロジェクト記憶

現状の不足:

- MVP記憶はセッション単位のJSONLが中心
- ユーザー、プロジェクト、文書、会話の境界がまだ曖昧
- ChatGPT Projectsのような "この作業だけの記憶" がない

実装方針:

- Prismaに `Project`、`ProjectMember`、`ProjectMemory`、`MemoryEvent` を追加する
- `POST /api/projects`、`GET /api/projects/:id`、`POST /api/projects/:id/memory` を追加する
- Milvusのメタデータに `projectId` と `userId` を持たせる
- UIにプロジェクト選択を追加し、記憶とRAG検索をプロジェクト単位で絞る
- `gardenState`、`strength`、`useCount`、`lastUsedAt` を持たせ、Memory Gardenとして育つ記憶にする

現在の実装反映:

- `Project`、`ProjectMember`、`ProjectMemory`、`MemoryEvent` のDB-backed storeを追加済み
- `/api/projects` でプロジェクト一覧/作成、`/api/projects/:id/memory` で記憶の追加/一覧を扱える
- 記憶は `active`、`disabled`、`forgotten` として制御できる
- Memory Gardenの最小状態として `sprout`、`rooted`、`withered`、`compost` を導入済み
- UI右ペインにProject Memoryを追加し、使う/使わない/Pin/忘れるを操作できる
- チャット送信時に選択中 `projectId` を渡し、Project Memoryを応答文脈へ入れる

主要ロジック:

- 会話から自動保存する記憶と、ユーザーが明示保存した記憶を分ける
- 記憶には `confidence`、`source`、`expiresAt`、`pinned` を持たせる
- プロンプトへ渡す記憶は直近順ではなく、関連度とピン留めを優先する
- "忘れる" は物理削除と無効化を選べるようにする

検証:

- プロジェクトAの記憶がプロジェクトBに混ざらない
- 記憶を削除すると次回応答に使われない
- ピン留め記憶が優先的に参照される

期待される変化:

ElysiaAIが "毎回はじめまして" ではなくなります。しかも、覚える範囲をユーザーが手綱として握れます。

### 初回起動ウィザード

現状の不足:

- Readiness APIはあるが、ユーザーが次に何をすればよいかがまだ散らばっている
- Ollama、モデル、FastAPI、Tauri、VOICEVOX、Security Gateの状態が一つの手順になっていない

実装方針:

- `GET /api/setup/readiness` を追加し、既存のMVP readiness、local-ops、healthを集約する
- `POST /api/setup/actions/pull-model` は最初はコマンド提示のみ。自動実行は明示承認後に限定する
- UIに "Setup" タブを追加し、未完了項目と復帰コマンドを表示する
- Windows / macOSで分岐する手順を `docs/GETTING_STARTED.md` と揃える

現在の実装反映:

- `GET /api/setup/readiness` を追加し、Local Ops、Ollama、FastAPI、VOICEVOX、Tauri、Prismaの状態をSetup Wizard用に集約済み
- `POST /api/setup/actions/pull-model` は `ollama pull <model>` の手動コマンド提示だけを返す
- UI右ペインにSetup Wizardを追加し、Core / FastAPI / Ollama / DB / Tauri / VOICEVOXを一画面で確認できる
- ポート状態を補助情報として返し、サービスが落ちているのか、ポートだけ開いているのかを追える
- VOICEVOXは任意項目として扱い、音声機能を使う時だけ起動すればよい導線にしている

主要ロジック:

- 状態は `ready`、`attention`、`blocked` の三段階に揃える
- ユーザーが今すぐ直せるものを上に出す
- 外部サービスが必要なものは "任意" と表示する
- 開発用自動ログインが無効な場合は、ログイン画面へ自然に誘導する

検証:

- Ollama未起動時に復帰手順が表示される
- モデル未取得時に `ollama pull` が案内される
- FastAPI未起動時に軽量モードの状態が見える
- Tauri設定が存在しない場合にblockedになる

期待される変化:

初回起動の不安が減ります。ユーザーは暗い森を歩くのではなく、灯りのついた廊下を進めます。

## 次点

### 成果物ワークベンチ

不足:

- 会話結果が成果物として残りにくい
- Markdown、コード、Mermaid、設計メモを横で編集する体験がない

実装:

- `Artifact`、`ArtifactRevision` をPrismaに追加する
- `POST /api/artifacts`、`PATCH /api/artifacts/:id`、`GET /api/artifacts/:id/revisions` を追加する
- UI右ペインに "Artifacts" タブを追加する
- MarkdownとMermaidはブラウザ内プレビュー、コードは読み取り中心から始める

成果:

会話が作業成果に変わります。Claude Artifactsに近い価値を、ローカル主権の中で実現できます。

### Privacy Ledger

不足:

- どの処理がローカルで、どの処理が外部APIへ出るのかが見えにくい
- OpenAI、Groq、Slack、Discord、Web検索などの外部境界がUIにまとまっていない

実装:

- `PrivacyEvent` をPrismaに追加する
- 回答単位の由来を残すために `AnswerTrace` を追加する
- 外部通信前に `provider`、`purpose`、`dataClass`、`userApproved` を記録する
- UIに "Privacy Ledger" を追加し、ローカル処理と外部処理を分けて表示する
- OpenAI/Groq利用時は、チャット画面にも `external` バッジを出す

成果:

ElysiaAIの主権性が、言葉ではなく画面で伝わります。これは小さく見えて、信頼の根になります。

### Agent承認ゲート

不足:

- Agent構想はあるが、ユーザーが承認できる実行計画として見えにくい
- ファイル変更、外部投稿、削除、OS操作の境界をUIで扱う必要がある

実装:

- `AgentPlan`、`AgentStep`、`ToolApproval` を追加する
- 初期はplan-onlyで、実行は必ずユーザー承認後にする
- 承認対象を `read`、`write`、`network`、`shell`、`external-post` に分類する
- 危険操作は既存のSecurity Agentと連動してblockedにする

成果:

自律性を急がず、信頼できる半自律へ進めます。これはElysiaAIらしい、品のある強さです。

## その後

### 音声/感情UI

- VOICEVOXの状態をReadinessに統合する
- チャットに音声ON/OFF、話速、声質、感情プリセットを追加する
- ローカルSTTはpush-to-talkから始める

### テスター分析

- `TesterFeedback` を追加し、初回起動時間、つまずいた箇所、毎日使いたい機能を記録する
- Beta 0.1の3〜5人テスト結果をIssue化しやすい形式で出す

### Tauri配布整備

- Windows / macOSのビルド確認をRunbookから配布手順へ進める
- READMEに実UIスクリーンショット、デモ動画、Known Issuesを追加する
- 署名、更新、依存ライセンス表記をRelease Checklistへ接続する

実装状況:

- `bun run desktop:check` でTauri配布前の静的点検を実行できるようにした
- `docs/TAURI_DISTRIBUTION_RUNBOOK.md` を追加し、Antigravity / Codexの分担、配布前点検、bundle作成、署名/更新判断を整理した
- Release ChecklistへTauri desktop bundle確認を接続した

## 革新的な追加アイデア

### Memory Garden

記憶を保存済みデータとして寝かせるのではなく、状態を持つ生きた情報として扱います。

- `ProjectMemory.gardenState` で `sprout`、`rooted`、`withered`、`compost` を表す
- 参照されるたびに `strength` と `useCount` を上げる
- 一定期間使われない記憶は `withered` へ落とし、回答投入候補から弱める
- ユーザーが明示的に残した記憶は `pinned` にして、自然減衰の対象外にする

期待される変化:

記憶がただの棚ではなく、手入れできる庭になります。強い記憶、薄れてよい記憶、土に返す記憶が自然に分かれます。

### Sovereign Source Map

回答ごとに、使った文書、記憶、外部通信、モデルを小さく表示します。

- `AnswerTrace.sourcesJson` にRAG文書とチャンクを保存する
- `AnswerTrace.memoriesJson` に使ったProjectMemoryを保存する
- `AnswerTrace.externalCallsJson` に外部API利用を保存する
- UIでは回答下部に "Sources / Memory / Model / External" を折りたたみ表示する

期待される変化:

ユーザーが "この答えはどこから来たのか" を静かに追えるようになります。信頼は説明で押し切るものではなく、見える場所に置くものです。

### Daily Desk Brief

起動時に、今日のプロジェクト、未解決メモ、Security Agentの注意点、最近追加したKnowledgeを短くまとめます。

- `Project` と `ProjectMemory` から今日使いそうな文脈を抽出する
- `KnowledgeSource.updatedAt` から最近追加された文書を表示する
- Security Agentの注意点は高リスク項目だけに絞る
- 初回起動ウィザード完了後のホーム面に短く出す

期待される変化:

ElysiaAIを開いた瞬間に、昨日から今日へ橋が架かります。ユーザーは思い出す作業から始めなくてよくなります。

## 推奨する最初の縦切り

最初のPRでは、RAG Import UXをすべて完成させようとしない方がよいです。小さく、でも手触りのある一本にします。

- Prismaに知識ソースとチャンクのモデルを追加する
- TXT / Markdownだけを対象にする
- `POST /api/knowledge/import` を追加する
- UIにKnowledgeタブを追加する
- チャットのRAG Sourcesに投入文書の出典を出す
- `bun run typecheck` と関連unit testを通す

この一本が通れば、PDF、Milvus再索引、プロジェクト記憶へ自然につながります。

## 完了条件

- ユーザーがUIから文書を投入できる
- 投入した文書が一覧で見える
- チャット応答に文書の出典が出る
- プロジェクト単位で記憶を分けられる
- 初回起動時に不足している依存が分かる
- 外部へ出る処理がPrivacy Ledgerに残る
- Agentは勝手に危険操作を実行しない

## 残す判断

- 知識ソースの最初の保存先をSQLite中心にするか、Milvus中心にするか
- PDF抽出をPythonへ寄せるか、Bun側で完結させるか
- プロジェクト記憶をMVP memoryから移行するか、並行運用するか
- Privacy Ledgerを全APIに横断適用するか、外部通信だけから始めるか

私の判断では、最初はSQLite中心、抽出はPython、記憶は並行運用、Ledgerは外部通信から始めるのがよいです。古い道具を磨くように、まず壊れにくい道を選びます。
