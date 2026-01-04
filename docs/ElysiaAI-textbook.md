# Elysia AI 完全解説教科書（ドラフト）

本書は Elysia AI リポジトリを題材に、ローカル開発から RAG/チャット、監視・運用までを一冊で把握できるようにするためのドラフトです。必要に応じて加筆・修正してください。

---

## 1. はじめに

- 目的: Bun/TypeScript と FastAPI/Python を跨ぐシステムを、どこを触れば何が動くかを明確にする。
- 前提: Bun/Node, TypeScript, FastAPI, Python、Redis（導入検討時）、Ollama、Milvus の基礎知識。
- 推奨環境: ローカル開発は Bun + Python venv。Ollama と Milvus はローカルまたは内部ネットワークで動かす。

## 2. 全体アーキテクチャ

- コンポーネント: Elysia/Bun ゲートウェイ、FastAPI RAG サーバー、Ollama、Milvus（任意）、Redis（導入時）、静的 UI。
- データフロー: クライアント → Elysia（認証/レート制限/メトリクス）→ FastAPI / Ollama → レスポンス SSE/JSON。
- デプロイ対象: 本番は dist バンドルまたは Bun ランタイムで Elysia、Python で FastAPI。Swagger エンドポイントはプレースホルダ（実 API ではない）。

## 3. セットアップ

- 依存インストール
  - JS: `bun install`（Node の場合は npm でも可）
  - Python: `python -m venv python/venv && source python/venv/bin/activate && pip install -r python/requirements.txt`
- 環境変数（.env.example をコピー）
  - AUTH_USERNAME, AUTH_PASSWORD（必須。本番でデフォルト禁止）
  - DATABASE_CONFIG.RAG_API_URL（例: <http://127.0.0.1:8000>）
  - OLLAMA_HOST, OLLAMA_MODEL（例: <http://127.0.0.1:11434>, llama3.2）
  - USE_MILVUS, MILVUS_URI, MILVUS_TOKEN（任意）
- 起動
  - `bun run dev` で FastAPI → Elysia の順に起動（ログは logs/）。
  - ヘルス確認: <http://localhost:3000/health>, <http://127.0.0.1:8000/health>
- 推奨環境: ローカル開発は Bun + Python venv。Ollama と Milvus はローカルまたは内部ネットワークで動かす。

## 4. Elysia/Bun ゲートウェイ（src/index.ts）

- 役割: 静的配信、認証、簡易レート制限、メトリクス、SSE 監視、RAG/Neuro プロキシ、デモ API を集約。
- 認証: AUTH_USERNAME/PASSWORD が未設定なら dev デフォルト。/auth/token でメモリ保持の access/refresh を発行（再起動で無効）。
- レート制限: メモリカウンタ。通常 50、アラート発火で 30（protect モード）。Redis 非使用。
- 監視: /health/summary（要認証）と /health/stream（SSE）で CPU/メモリ/HTTP レイテンシ/エラー/RAG レイテンシを配信。p95 やエラー増加でアラート判定し、ALERT_WEBHOOK_URL があればデバウンス通知。
- チャット SSE /elysia-love: バリデーション + 簡易プロンプトインジェクション検知。useEnsemble 指定時に multiModelEnsemble でモデル選択し、ヘッダにモデル名/信頼度/時間を出力。
- RAG/Neuro プロキシ: FASTAPI_HOST（DATABASE_CONFIG.RAG_API_URL）に /api/neuro/memory/\* を中継。FastAPI ダウン時は 503。
- その他: /ops/locust/run でバックグラウンド locust 起動。/metrics は Prometheus 形式でメトリクス出力。

## 5. FastAPI RAG/チャット（python/fastapi_server.py）

- モデル: SentenceTransformers `all-MiniLM-L6-v2`。失敗時も起動し、ランダム返しにフォールバック。
- RAG /rag: 危険語チェック → クエリ埋め込み → コサイン類似度で上位 SEARCH_LIMIT 件を返却。モデル未ロード時はランダム。
- Chat /chat: ユーザ最新発話をベクトル化 → 類似台詞を文脈化 → システムプロンプト生成 → Ollama へストリーム。safe_filter でコード/秘密指示を除去。
- Milvus: USE_MILVUS=true なら pymilvus で接続。失敗時は自動でインメモリへ戻す。
- Neuro: neuro_module があれば MemoryHandler を利用、なければ無効。
- ヘルス: /health で埋め込み件数と Ollama 接続状態を返す。

## 6. マルチモデルアンサンブル

- /elysia-love で useEnsemble を指定すると multiModelEnsemble.execute を呼ぶ。戦略例: quality/speed/consensus（詳細は実装依存）。
- ヘッダ: X-Elysia-Ensemble-Model, X-Elysia-Ensemble-Confidence, X-Elysia-Ensemble-Time を返す。
- /ensemble/stats（要認証）でモデル一覧と統計を確認。/ensemble/config で weight/timeout/enabled を更新可能。

## 7. 静的 UI（public/）

- index\*.html: Alpine + htmx で SSE を受信するチャットデモ。
- admin-extended.html: /health/stream を購読する監視ダッシュボード。変更時は互換性に注意。

## 8. データとログ（data/）

- JSONL ログやナレッジを格納。サイズローテーション用スクリプトが別途存在（rotate:jsonl 等）。
- FastAPI のエクスポート/インポート API でパス指定する際に利用。

## 9. スクリプトと運用

- scripts/dev.sh|ps1: FastAPI →（任意で network-sim）→ Elysia をバックグラウンド起動、ログは logs/。
- scripts/start-fastapi.\*: venv を有効化して python/fastapi_server.py を起動。
- scripts/start-server.\*: Ollama チェック・モデル pull 後、bun src/index.ts または node dist/index.js を起動。
- Prisma 7: prisma/ および scripts/ 配下に関連スクリプト（詳細は別途確認）。

## 10. 品質とテスト

- 単体/E2E: bun test（必要に応じて --watch|--coverage）。
- Lint/Format: bun run lint, bun run format, bun run fix。
- Playwright: config/internal/playwright.config.ts を参照（必要に応じて準備）。

## 11. セキュリティ実務

- 本番でデフォルト認証を使わない（AUTH_USERNAME/PASSWORD を必須設定）。
- メモリトークンは再起動・スケールで破綻するため、JWT + Redis への移行を推奨。
- レート制限を Redis ベースにし、フェイルオープン方針を運用で決定。
- SSE 入出力に対し、プロンプトインジェクション防御と safe_filter の強化を検討。
- PII/秘密はログに残さず、.env はコミットしない。Ollama/Milvus は内部ネットワーク + 認証/TLS で保護。

## 12. 監視と運用

- メトリクス: HTTP 数/レイテンシ/エラー、認証試行、RAG レイテンシ、レートリミット超過、SSE 接続数。
- アラート（組み込みロジック）: p95 > 1.2s warn / > 2s crit、エラー総数 > 5 warn / > 20 crit、LoadAvg 1m > 1.5 warn / > 2.5 crit。クリティカル時は自己防衛でレートしきい値を 50→30。
- 可視化: /metrics を Prometheus でスクレイプし Grafana へ。軽量用途は public/admin-extended.html の SSE ダッシュボード。

## 13. デプロイのヒント

- ランタイム: Bun/Node どちらでも可。Webpack 出力 dist/index.js を本番実行するか、Bun ランタイムを同梱。
- 起動順: FastAPI(8000) → Elysia(3000)。
- Ollama: 事前に ollama pull llama3.2。外部公開しない。
- Milvus: USE_MILVUS=true なら mTLS/認証とネットワーク隔離を前提に。
- 環境変数: AUTH*\*, DATABASE_CONFIG.RAG_API_URL, OLLAMA*\*, USE_MILVUS, MILVUS_URI/TOKEN を環境ごとに分離。

## 14. 付録

- よくあるエラー: FastAPI が上がらない（venv/ポート競合）、Ollama 接続不可（サービス未起動/モデル未 pull）、p95 悪化（負荷やバックエンド遅延を確認）。
- コマンド例（参考）: 開発起動 `bun run dev`、ヘルス確認 `/health`, `/metrics`、RAG 呼び出し `POST /rag {"text":"こんにちは"}`、チャット `POST /chat`。
- 用語集: RAG, SSE, p95, Ollama, Milvus, LRU, フェイルオープン。

---

※ 本書はドラフトです。セキュリティ強化（JWT+Redis 化、safe_filter 拡張）、監視ダッシュボード（Grafana パネル例）、アンサンブルの詳細チューニングなどは今後の加筆候補です。
