# ElysiaAI Observability Quickstart 2026

## 要約

このメモは、ElysiaAIの監視とオブザーバビリティを小さく始めるための方針です。

まず見るべきものは、派手なAI分析ではありません。サービスが生きているか、なぜ遅いか、どこで詰まったかを、メトリクス、構造化ログ、トレースで追えるようにします。

## 監視とオブザーバビリティ

- 監視: サービスが生きているかを見る
- オブザーバビリティ: なぜ壊れたか、どこで遅いかを追う
- 最初はメトリクスと構造化ログで十分
- 次にトレースを入れ、リクエスト単位で原因を追う
- 標準の軸はOpenTelemetryに寄せる

## 最小構成

- 収集: OpenTelemetry SDK / Collector
- メトリクス: Prometheus
- 可視化: Grafana
- ログ: Loki
- トレース: TempoまたはJaeger
- 外部公開: InstatusやGitHub Status相当の軽いステータスページ

ローカルファーストを優先するなら、まずはPrometheus、Grafana、Lokiだけで始めます。トレースは遅延や外部依存の調査が必要になった時に足します。

## ElysiaAIで最初に見る指標

### REDメトリクス

- Rate: リクエスト数
- Errors: 5xx、4xx、上流エラー
- Duration: P50、P95、P99

### プロダクト指標

- RAG Import成功率
- RAG再索引失敗率
- KnowledgeSourceの有効/無効数
- Project Memory保存数
- Memory Gardenのwithered / compost候補数
- Artifact作成/更新数
- Agent承認待ち件数
- Agent拒否件数
- Privacy Ledger欠落件数
- Daily Desk Brief生成時間
- Voice Full / Summary / Silent Badgeの利用比率

### 依存サービス

- Bun / Elysia API
- FastAPI AI Kernel
- Ollama
- Prisma DB
- Redis / Queue
- Milvus Liteまたはベクトルストア
- VOICEVOX
- OpenAI / Groqなどの外部LLM

## ログ方針

- requestIdを必ず出す
- traceIdとspanIdを出す
- userIdは必要最小限にする
- private RAG contentはログへ出さない
- APIキー、トークン、Webhook URLは絶対に出さない
- Privacy Ledgerは監査用に残し、通常ログとは分ける

## トレース方針

最初に入れるspan:

- `http.request`
- `auth.token`
- `rag.import`
- `rag.search`
- `knowledge.reindex`
- `project.memory.context`
- `artifact.update`
- `agent.approval`
- `privacy.ledger.record`
- `voice.synthesize`
- `daily_desk.brief`

`docs/TELEMETRY_GUIDE.md` の既存実装は、W3C Trace Context互換の軽量実装として扱います。外部Collectorへつなぐ時は、OpenTelemetry CollectorのOTLP HTTP/gRPCに寄せます。

## アラート設計

即時対応:

- 5xxが3%を超えて5分続く
- Auth失敗率が1%を超える
- P95が平常比50%以上悪化する
- DBラグが30秒を超える
- Privacy Ledger欠落が1件でも出る
- Agent承認ゲートの迂回が疑われる

注意喚起:

- RAG Import失敗率が1%を超える
- Queue滞留が増え続ける
- VOICEVOX失敗が増える
- 外部LLM呼び出しが急増する
- ログ/トレース量が予算を超えそうになる

## ダッシュボード

当日ビュー:

- API health
- Auth
- RAG Import / Search
- Project Memory
- Artifact Workbench
- Agent Approval
- Privacy Ledger
- DB / Queue
- Ollama / FastAPI
- Tauri distribution

常設ビュー:

- REDメトリクス
- SLO
- エラーバジェット
- 外部通信
- コストと保持期間
- Security Agent

## コストを抑える

- ログ保持期間を短く始める
- Debugログを本番で常時出さない
- トレースはサンプリングする
- P0時だけサンプリング率を上げる
- RAG本文や長いプロンプトを保存しない
- Dashboardは少数から始め、使わないものを消す

## 今日からのチェックリスト

- [ ] requestIdをレスポンスとログに出す
- [ ] `/health` と `/metrics` をダッシュボード化する
- [ ] 5xx、P95、Auth失敗率のアラートを作る
- [ ] RAG ImportとProject Memoryの成功/失敗を計測する
- [ ] Agent承認ゲートの拒否/承認待ちを計測する
- [ ] Privacy Ledger欠落を即時アラートにする
- [ ] ログとトレースの保持期間を決める
- [ ] P0時のダッシュボードURLをRunbookに貼る

## 参考

- OpenTelemetry: https://opentelemetry.io/
- OpenTelemetry Collector: https://opentelemetry.io/docs/collector/
- Grafana OpenTelemetry docs: https://grafana.com/docs/opentelemetry/
- ElysiaAI rollback: `docs/EMERGENCY_ROLLBACK_RUNBOOK.md`
