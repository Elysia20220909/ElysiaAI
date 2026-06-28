# ElysiaAI Production Deploy Day Playbook - 2026-07-21

## 要約

このRunbookは、2026-07-21の大きな本番リリース当日に使う運用タイムラインです。

目的は、勢いで押し切ることではありません。失敗した時の被害半径を小さくし、判断停止を避け、必要ならすぐ切り戻せる状態で出荷することです。

## 目的

- リリース中の判断を短くする
- P0障害を早く検知する
- フィーチャーフラグとロールバック手順で出血を止める
- ユーザーの記憶、文書、成果物、監査ログを守る

## 用語

- SLO: 可用性、遅延、エラー率などのサービス目標
- P0: すぐ止めるべき最優先障害
- Flag closed: 新機能を無効にした状態
- High attention: 全員が監視を見ている観察時間

## 事前前提

- ロールバック手順と直前ビルドの整合性を確認している
- `docs/EMERGENCY_ROLLBACK_RUNBOOK.md` を開ける状態にしている
- フラグ、環境変数、設定変更の担当者を決めている
- Pager、Slack、音声ブリッジ、電話連絡網をRunbook先頭に貼っている
- 当日専用ダッシュボードを用意している
- ダッシュボードにはAuth、RAG Import、Project Memory、Artifacts、Agent Approval、Privacy Ledger、DB、Queue、Tauri配布を並べる
- `bun run morning` でPR、CI、未pushコミットの状態を確認している

## 当日タイムライン

### 最終ステージングスモーク

- 時間: 5分から10分
- オーナー: QAリード `@qa`
- ゲート: チェックリスト全項目OK
- 内容:
  - `/health`、`/metrics`、`/openapi` が期待通りに返る
  - Authのログイン、更新、ログアウトが通る
  - RAG ImportでTXT、Markdown、PDFの投入ができる
  - Project Memoryの追加、無効化、忘れる操作ができる
  - Artifact Workbenchで作成、更新、履歴確認ができる
  - Agent承認ゲートで危険操作が承認待ちになる
  - Privacy Ledgerに外部通信とローカル処理の記録が出る
- アボート:
  - P0が出る
  - 5xxが3%を超えて5分続く
  - Agent承認ゲートを迂回できる
  - Privacy Ledgerが記録されない

### DBスナップショットとリストア確認

- 時間: 3分から5分
- オーナー: DBA `@dba`
- ゲート: スナップショットID取得とテストリストア成功
- 対象:
  - Prisma DB
  - Project Memory
  - KnowledgeSource / DocumentChunk
  - Artifact revision
  - Privacy / Action logs
- アボート:
  - リストアに失敗する
  - DBラグが30秒を超える
  - マイグレーションの戻し方が説明できない

### キャパシティクイックランプ

- 時間: 最大30分
- オーナー: SRE `@sre`
- ゲート:
  - P95遅延が基準内
  - 5xxが0.5%未満
  - Queue滞留が増え続けない
- 内容:
  - `/api/ai`、`/api/knowledge`、`/api/projects`、`/api/artifacts`、`/api/privacy` を段階的に確認する
  - 合成負荷は25%、50%、75%の順で上げる
  - Ollama、FastAPI、VOICEVOXは任意依存として分けて見る
- アボート:
  - P95が許容値を超える
  - 5xxが3%を超えて5分続く
  - RAG再索引が詰まり続ける
  - DBラグが30秒を超える

### 本番デプロイ

- 時間: 10分から15分
- オーナー: リリースマネージャ `@rm`
- ゲート:
  - CHANGELOG確認済み
  - マイグレーションの戻し方を確認済み
  - 新機能フラグは閉じた状態で出荷
  - `docs/RELEASE_CHECKLIST.md` の対象項目が済んでいる
- 内容:
  - リリース候補を適用する
  - 最初は新機能を閉じたまま、健康状態だけを見る
  - 問題がなければ10%、25%、50%、100%の順で解放する
- アボート:
  - P0検知
  - Auth失敗率が1%を超える
  - 主要SLO逸脱
  - Agent承認ゲートの誤動作
  - Privacy Ledgerの欠落

### ポストデプロイスモーク

- 時間: 合計10分
- オーナー:
  - Auth: `@auth`
  - RAG / Knowledge: `@rag`
  - Memory / Artifact: `@memory`
  - Agent / Privacy: `@safety`
- ゲート:
  - 主要ユーザーフローOK
  - 監視に異常なし
  - 外部送信とローカル処理の区別がLedgerに出る

### High Attention観察

- 時間: 30分から60分
- オーナー: 当番SRE `@sre-oncall`
- 参加: 機能オーナー、DBA、リリースマネージャ、コミュニケーション係
- 見るもの:
  - SLO
  - 5xx
  - P95 / P99
  - DB health
  - Queue滞留
  - RAG Import失敗率
  - Agent承認待ち件数
  - Privacy Ledger欠落
  - 外部LLM呼び出し件数
  - Tauri配布の問い合わせ件数
- 即時ロールバック条件:
  - P0発生
  - 5xxが3%を超えて5分続く
  - P95が許容値を超え続ける
  - DBラグが30秒を超える
  - 記憶、文書、成果物の破損疑いが出る

## フィーチャーフラグ進行

- 初期状態はFlag closed
- 解放は10%、25%、50%、100%の順で進める
- 各段階で5分から10分観察する
- RAG FastAPI抽出やMilvus Lite接続は、最初から全員へ開けない
- 影響が大きい機能はテスター、内部利用、全体の順で解放する
- 逸脱時はFlag closedに戻し、原因を切り分けてから再試行する

## 当日メッセージテンプレ

### 開始

```text
@channel ElysiaAI本番デプロイを開始します。変更ID: X.Y.Z。ロールバック手順は docs/EMERGENCY_ROLLBACK_RUNBOOK.md を参照してください。
```

### ゲート通過

```text
スモークOK。DBスナップショットID: snap-xxxxx。合成負荷75% P95=XXXms、5xx=0.0X%。
```

### 異常時

```text
P0宣言。症状: 5xx 4.2%が5分継続。該当フラグを閉じ、ロールバック手順へ移ります。ETA n分。
```

### 完了

```text
ElysiaAI本番デプロイ完了。High Attention観察を継続します。次の更新は30分後です。
```

## 役割

- リリースマネージャ: `@rm`
- SRE: `@sre`
- DBA: `@dba`
- QA: `@qa`
- Auth責任者: `@auth`
- RAG責任者: `@rag`
- Memory / Artifact責任者: `@memory`
- Agent / Privacy責任者: `@safety`
- 外向けコミュニケーション: `@comms`

## 当日チェックリスト

- [ ] `bun run morning` でPR、CI、未pushコミットを確認した
- [ ] ロールバック手順とビルドの整合性を確認した
- [ ] スナップショットIDを記録した
- [ ] テストリストアに成功した
- [ ] 当日ダッシュボードを開いた
- [ ] 新機能フラグの初期状態を閉にした
- [ ] ステージングスモークが通った
- [ ] 合成負荷25%、50%、75%でSLO内だった
- [ ] 本番ロールアウト10%、25%、50%、100%を監視した
- [ ] Privacy Ledgerに記録が出ている
- [ ] Agent承認ゲートが危険操作を止めている
- [ ] High Attention観察でSLOが安定した
- [ ] 事後メモを作成した

## 事後メモ

15分で下書きを作ります。

- 変更点
- メトリクス推移
- インシデント有無
- ユーザー影響
- 学び
- 再発防止
- Runbook改訂点
- ダッシュボード恒久化の要否
- アラート閾値の見直し
