# Elysia AI 完全解説教科書（ドラフト）

本書は Elysia AI リポジトリを題材に、ローカル開発から RAG/チャット、監視・運用までを一冊で把握できるようにするためのドラフトです。必要に応じて加筆・修正してください。

---

## 目次

- [1. はじめに](#1-はじめに)
- [2. 全体アーキテクチャ](#2-全体アーキテクチャ)
- [3. セットアップ](#3-セットアップ)
- [4. Elysia/Bun ゲートウェイ（src/index.ts）](#4-elysiabun-ゲートウェイsrcindexts)
- [5. FastAPI RAG/チャット（python/fastapi_server.py）](#5-fastapi-ragチャットpythonfastapi_serverpy)
- [6. マルチモデルアンサンブル](#6-マルチモデルアンサンブル)
- [7. 静的 UI（public/）](#7-静的-uipublic)
- [8. データとログ（data/）](#8-データとログdata)
- [9. スクリプトと運用](#9-スクリプトと運用)
- [10. 品質とテスト](#10-品質とテスト)
- [11. セキュリティ実務](#11-セキュリティ実務)
- [12. 監視と運用](#12-監視と運用)
- [13. デプロイのヒント](#13-デプロイのヒント)
- [14. 付録](#14-付録)

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

### 11.1 JWT + Redis 化の設計メモ

- トークン: アクセス JWT（短寿命）＋リフレッシュ JWT。`jti` を必ず付与し、Redis にホワイトリスト保存。
- クレーム: `sub`（ユーザ ID）、`iat`、`exp`、`jti`。ローテーション時は旧 `jti` を失効させ新トークンを保存。
- 検証: Elysia 側で `jose` などを使って署名検証。失効リストは Redis を参照。
- 署名鍵: `JWT_SECRET`/`JWT_REFRESH_SECRET` を環境変数で渡し、Vault/Key Vault で管理。
- レート制限: Redis のトークンバケット/スライディングウィンドウで `ip + sub` をキーにする。Redis ダウン時はポリシーに従いフェイルオープン or フェイルクローズ。

### 11.2 safe_filter 強化の方向性

- 出力フィルタ: コードブロック・インラインコードの除去に加え、URL/秘密情報誘発フレーズ（password/api key/secret/token 等）をフィルタリング。
- 入力フィルタ: 危険コマンド/プロンプトインジェクションをルール＋スコアリングで判定。高リスクは拒否・中リスクは要確認ラベル。
- ロギング: フィルタ適用前後の差分をメトリクス化（何件フィルタされたか）。

## 12. 監視と運用

- メトリクス: HTTP 数/レイテンシ/エラー、認証試行、RAG レイテンシ、レートリミット超過、SSE 接続数。
- アラート（組み込みロジック）: p95 > 1.2s warn / > 2s crit、エラー総数 > 5 warn / > 20 crit、LoadAvg 1m > 1.5 warn / > 2.5 crit。クリティカル時は自己防衛でレートしきい値を 50→30。
- 可視化: /metrics を Prometheus でスクレイプし Grafana へ。軽量用途は public/admin-extended.html の SSE ダッシュボード。

### 12.1 Grafana パネル例

- HTTP レイテンシ: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))`
- エラーレート: `sum(rate(http_errors_total[5m])) / sum(rate(http_requests_total[5m]))`
- RAG レイテンシ p95: `histogram_quantile(0.95, sum(rate(rag_query_duration_seconds_bucket[5m])) by (le))`
- レートリミット超過: `rate(rate_limit_exceeded_total[5m])`
- SSE 接続数: `connections_current`
- アラート案: p95 > 1.2s (warn) / > 2s (crit), error rate >1% (warn) / >5% (crit)

## 13. デプロイのヒント

- ランタイム: Bun/Node どちらでも可。Webpack 出力 dist/index.js を本番実行するか、Bun ランタイムを同梱。
- 起動順: FastAPI(8000) → Elysia(3000)。
- Ollama: 事前に ollama pull llama3.2。外部公開しない。
- Milvus: USE_MILVUS=true なら mTLS/認証とネットワーク隔離を前提に。
- 環境変数: AUTH*\*, DATABASE_CONFIG.RAG_API_URL, OLLAMA*\*, USE_MILVUS, MILVUS_URI/TOKEN を環境ごとに分離。

### 13.1 アンサンブルの詳細チューニング

- モデル例: `fast-small` (weight 1.0, timeout 6s), `balanced` (1.2, 12s), `high-quality` (1.5, 20s)
- 戦略:
  - quality: 全モデルを走らせ重み付きスコアで選択
  - speed: 最初に返った応答で閾値（例 0.55）を超えたら採用
  - consensus: 2/3 以上の一致（類似度や n-gram 近接）なら採用、なければ quality にフォールバック
- 計測: モデル別成功/失敗、p50/p95 レイテンシ、タイムアウト件数、選択率、信頼度分布をメトリクス化し Grafana で可視化

## 14. 付録

- よくあるエラー: FastAPI が上がらない（venv/ポート競合）、Ollama 接続不可（サービス未起動/モデル未 pull）、p95 悪化（負荷やバックエンド遅延を確認）。
- コマンド例（参考）: 開発起動 `bun run dev`、ヘルス確認 `/health`, `/metrics`、RAG 呼び出し `POST /rag {"text":"こんにちは"}`、チャット `POST /chat`。
- 用語集: RAG, SSE, p95, Ollama, Milvus, LRU, フェイルオープン。

---

※ 本書はドラフトです。構成やパラメータは運用結果に応じて随時アップデートしてください。
