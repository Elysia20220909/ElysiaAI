# ElysiaAI Emergency Rollback Runbook

## 要約

このRunbookは、プロダクト運用中に"壊れたかもしれない"と感じた時、迷わず被害を止めるための短い手順です。

最初の目的は原因究明ではありません。まず出血を止めます。RAG、記憶、Agent、外部LLM、音声、配布経路を小さく切り分け、10分以内に指標回復へ向かわせます。

## 原則

- 原因究明より被害最小化を優先する
- 新機能は切る、データ破損は隔離する
- DB復旧は最後の手段にする
- 判断は定量トリガーで機械的に行う
- 誰が何をしたかを時刻付きで残す

## 発火トリガー

直近5分で次のどれかを満たしたら、即時対応へ入ります。

- Auth失敗率が1%を超える
- 5xxが3%を超える
- P95レイテンシが平常比50%以上悪化する
- RAG Import失敗率が3%を超える
- Project Memory、Artifact、Knowledgeの整合性チェックにヒットする
- Agent承認ゲートを迂回できる
- Privacy Ledgerが外部通信を記録しない
- Queue滞留が増え続ける
- DBラグが30秒を超える
- エラーバジェット消費速度が平常比2倍を超える

## 即時アクション

### 出血止め

目安は30秒です。

- 該当機能のフラグを閉じる
- RAG FastAPI抽出を止める場合は `ELYSIA_KNOWLEDGE_EXTRACT_FASTAPI=0` に戻す
- RAGベクトル索引を止める場合は `ELYSIA_KNOWLEDGE_INDEX_FASTAPI=0` に戻す
- 外部LLMが疑わしい場合はOpenAI / Groq経路を止め、ローカルOllamaまたはSilent fallbackへ戻す
- VOICEVOXが詰まる場合は音声読み上げをSilent Badgeへ戻す
- Agentが危険な場合は承認ゲートを必須にし、OS操作、削除、外部送信を止める
- ステータスページと社内向けに一言だけ出す

告知例:

```text
新機能の不具合を検知したため、一時的に従来ロジックへ切り戻しました。会話、文書、記憶の閲覧は継続できます。詳細は追って共有します。
```

### トラフィック制御

目安は2分から5分です。

- 新しいAPI経路へのルーティング比率を0%に戻す
- カナリアだけを残し、一般ユーザーへの露出を止める
- FastAPI、Milvus Lite、外部LLM、VOICEVOXなど任意依存を切り離す
- 影響が大きい場合はTauri配布を一時停止し、既存配布物の案内だけ残す

### 非同期ジョブ隔離

目安は2分から10分です。

- RAG再索引ジョブを止める
- Knowledge importの再投入を止める
- Queue consumerを一時停止する
- 影響範囲のキャッシュだけを無効化する
- Project MemoryやArtifactの書き込みが疑わしい場合は読み取り専用運用にする
- Privacy LedgerとActionLogは止めない。監査の灯りは最後まで残す

### DB復旧

DBスナップショット復旧は最後の手段です。

実施条件:

- 実データ破損が検証で確定している
- 影響範囲がクエリ、キャッシュ、ジョブ隔離では収まらない
- 顧客影響、復旧時間、ロールフォワード方法を説明できる
- DBAとリリースマネージャが同意している

実施前に書くこと:

- 復旧対象
- スナップショットID
- 復旧見込み時間
- 失われる可能性があるデータ
- 補填や再計算の方針

## 切り戻しの具体例

### RAG Importが壊れた

- `ELYSIA_KNOWLEDGE_EXTRACT_FASTAPI=0` にする
- `ELYSIA_KNOWLEDGE_INDEX_FASTAPI=0` にする
- 新規Importを止める
- 既存KnowledgeSourceは読み取りだけ許可する
- `document_chunks` と `embedding_jobs` の失敗数を確認する
- 復旧後に再索引を小さな文書から再開する

### Project Memoryが混線した

- Project Memoryの自動保存を止める
- 手動保存だけ許可する
- 疑わしい `projectId` の応答利用を止める
- MemoryEventを確認し、混線した範囲を特定する
- 物理削除ではなく無効化で止める

### Agent承認が危険になった

- Agentをplan-onlyに戻す
- ファイル変更、削除、OS操作、外部送信を拒否する
- 保留中のToolApprovalを全て再確認対象にする
- ActionLogとPrivacy Ledgerで実行済み操作を確認する

### Privacy Ledgerが欠落した

- 外部送信機能を止める
- OpenAI、Groq、Slack、Discord、Web searchを一時停止する
- ローカル処理だけに戻す
- Ledger復旧まで新しい外部連携を開けない

### Voice / Emotion UIが詰まった

- 読み上げモードをSilent Badgeへ戻す
- VOICEVOX呼び出しを止める
- Emotion metadata保存だけを継続するか判断する
- Daily Desk Briefには音声要約ではなくテキスト要約だけを出す

### Tauri配布物に問題が出た

- GitHub Releaseをdraftまたはprereleaseへ戻す
- 配布リンクを一時停止する
- 既知の良いビルドのchecksumを案内する
- `docs/TAURI_DISTRIBUTION_RUNBOOK.md` に戻って再点検する

## 24時間から72時間の後遺症

- キャッシュ再温め: よく使うRAG検索、Daily Desk Brief、Setup Wizard healthを先に温める
- RAG再索引遅延: 小さな文書から順に再開し、PDFは最後にする
- Queue波: consumerを段階的に戻す
- 一過性エラー: 指数バックオフとジッタを確認する
- 記憶の信頼低下: Memory Gardenで弱い記憶をwitheredへ落とし、ユーザー確認へ回す
- テスター混乱: 影響範囲、復旧済み機能、未復旧機能を短く共有する

## 事後メモ

Root Causeより、まず学習を残します。

- UTC時刻
- 誰が検知したか
- どのトリガーを満たしたか
- 何を止めたか
- 何分で指標が戻ったか
- 顧客影響
- 再発防止
- 追加するテスト
- 追加する監視
- Runbookの修正点

## 即使えるテンプレ

### P0宣言

```text
P0宣言。症状: [指標] が [時間] 継続。担当: @rm / @sre。まず該当機能を閉じます。
```

### 切り戻し開始

```text
切り戻し開始。対象: [機能名]。操作: フラグ閉 / Queue停止 / キャッシュ無効化。ETA: [分]。
```

### 回復確認

```text
回復確認。5xx=[値]、P95=[値]、Queue=[値]、Ledger=[正常/異常]。High Attentionを継続します。
```

### ユーザー向け

```text
一部の新機能で不具合を検知したため、従来の安定した経路へ切り戻しました。会話、文書、記憶の閲覧は継続できます。詳細と再開時刻は追ってお知らせします。
```

## ミニチェックリスト

- [ ] P0かどうかを宣言した
- [ ] 該当機能のフラグを閉じた
- [ ] 任意依存を切り離した
- [ ] Queueを止めた、または滞留を確認した
- [ ] キャッシュをピンポイントで無効化した
- [ ] DB復旧が本当に必要か確認した
- [ ] Privacy LedgerとActionLogを残した
- [ ] 社内向けに一言出した
- [ ] ユーザー向け告知の下書きを作った
- [ ] 10分後の指標回復を確認した
- [ ] 事後メモを作った
