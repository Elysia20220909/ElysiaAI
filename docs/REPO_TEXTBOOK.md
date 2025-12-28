# Elysia AI リポジトリ教科書（総合版）

本書は `Elysia AI` リポジトリ全体を「何をどこで・どう動かすか」を体系化した教科書です。Bun+Elysia のゲートウェイ、Python FastAPI の RAG バックエンド、Rust ネットワークスタック、デスクトップ／モバイル／ネイティブ派生物までを俯瞰します。

---
## 1. 全体像と役割

- **フロント/UI**: `public/`（Alpine + htmx + TailwindCSS）。SSE でストリーミング表示。
- **ゲートウェイ/API**: `src/` の Bun + Elysia サーバー。JWT 認証、Redis レート制限、観測基盤、SSE 返却。
- **RAG & LLM**: `python/fastapi_server.py`。埋め込み・検索・Ollama 推論。`DATABASE_CONFIG.RAG_API_URL` で Elysia と連携。
- **ベクトルDB**: Milvus (Lite/外部)。`USE_MILVUS` で切替。
- **キャッシュ/レート制限**: Redis。
- **観測**: `/metrics` (Prometheus), `/health`, `/swagger`。
- **Rust ネットワークスタック**: `rust/`（独立モジュール）。自作 TCP/IP + eBPF + QUIC + GRO/GSO。教材/研究用途。
- **マルチプラットフォーム**: `desktop/` (Electron系)、`mobile/`、`native/`、`wasm/` 等の派生。

### ランタイムのデータフロー
```
Client (Web UI)
  ↓ HTTPS + SSE
Elysia (Bun/TypeScript)
  ├─ Redis (rate limit, cache)
  ├─ FastAPI RAG (Python)
  │    └─ Milvus / Embeddings
  └─ Ollama (LLM) → SSE stream back to client
```

---
## 2. 主要ディレクトリと読む順番

| フォルダ | 役割 | 最初に読むもの |
| --- | --- | --- |
| `src/` | Elysia サーバー本体 | `src/index.ts` (ゲートウェイ) |
| `.internal/` | 認証・設定・LLM プリセット・セキュリティ | `.internal/app/llm/llm-config.ts` / `.internal/secure/auth/*` |
| `scripts/` | 起動・開発支援スクリプト | `scripts/dev.*` / `scripts/start-fastapi.*` |
| `config/internal/` | webpack/環境設定 | `config/internal/webpack.config.js` |
| `python/` | FastAPI RAG, 埋め込み・検索 | `python/fastapi_server.py` |
| `rust/` | ネットワークスタック教材 | `rust/TEXTBOOK.md` / `rust/src/network/*` |
| `docs/` | 各種ガイド | `docs/GETTING_STARTED.md`, `docs/ARCHITECTURE.md` |
| `public/` | フロント UI | `public/index.html`, `public/admin-extended.html` |
| `tests/` | TypeScript テスト | (必要に応じ確認) |

---
## 3. セットアップと起動

### 3.1 事前要件
- Bun 1.x
- Node.js (補助的)
- Python 3.11+（FastAPI用）
- Milvus (任意、Lite or 外部)
- Redis
- Ollama （`OLLAMA_MODEL` 指定）

### 3.2 初回セットアップ
```bash
# 依存インストール
bun install

# Python サービスのセットアップ
bun run scripts/setup-python.ps1   # Windows
./scripts/setup-python.sh          # Linux/macOS/WSL
```

### 3.3 起動
```bash
# すべてのサービス（FastAPI→Elysia）
bun run dev
# ログは ./logs/*.log に出力
```
`http://localhost:3000/swagger` で API/UI を確認。

---
## 4. 環境変数の要点
- `.env`（テンプレート: `.env.example`）に主要キー。
- 代表例: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RATE_LIMIT_RPM`, `RAG_API_URL`, `OLLAMA_HOST`, `OLLAMA_MODEL`, `USE_MILVUS`, `REDIS_URL`。
- 開発で Milvus を使わない場合は Lite モードか無効化設定を利用。

---
## 5. バックエンド詳細（Elysia / TypeScript）
- **エントリーポイント**: `src/index.ts`
  - JWT 認証, Redis レート制限, テレメトリ、監査ログ、SSE。
- **パターン**: `t.Object` バリデーション、`jsonError` でエラー返却。
- **認証**: `.internal/secure/auth` の refresh token フロー（Redis に保存）。
- **LLMプリセット**: `.internal/app/llm/llm-config.ts`
- **ビルド**: `config/internal/webpack.config.js` → 出力 `dist/`。
- **起動スクリプト**: `scripts/dev.*`, `scripts/start-server.*`。

---
## 6. Python FastAPI（RAG）
- ファイル: `python/fastapi_server.py`
- 役割: 埋め込み生成、ベクトル検索、Ollama 呼び出し、SSE 連携。
- 環境: `USE_MILVUS` で Milvus Lite/外部の切替。ポート 8000（標準）。
- 起動（単体）例: `python python/fastapi_server.py`

---
## 7. Rust ネットワークスタック（教材）
- 場所: `rust/`
- 教科書: `rust/TEXTBOOK.md`
- 構成: Ethernet/IP/TCP/UDP、BBR/CUBIC、eBPF VM+JIT、QUIC/HTTP3、GRO/GSO、ゼロコピー、並列処理。
- テスト: `cargo test`, `cargo test --test advanced_integration_test`, `cargo test --test advanced_features_test`。
- 用途: 実サービスとは独立した学習・研究用モジュール。

---
## 8. デスクトップ/モバイル/ネイティブ
- `desktop/`: Electron 風バンドル。`desktop/README.md` 参照。
- `mobile/`, `native/`, `wasm/`: 必要に応じてプラットフォーム固有ビルド。
- `monitoring/`, `deploy/`: 監視・リバプロ設定（例: `deploy/nginx.conf.example`）。

---
## 9. セキュリティと運用
- JWT + Refresh トークン（Redis 保存）。
- レート制限: `checkRateLimitRedis`（Redis 不通時は許可へフォールバック）。
- ヘッダー: `X-Content-Type-Options`, `X-Frame-Options` 等をミドルウェアで付与。
- 監査/メトリクス: すべてのリクエストを監査ログ、Prometheus `/metrics`。
- データ永続化: `data/` 配下に JSONL ログ（feedback/knowledge/voice）。サイズローテーションは `scripts/rotate:jsonl` 系。

---
## 10. テストと品質
- TypeScript: `bun test`, `bun run lint`, `bun run format`（Biome）。
- Rust: `cargo test`（advanced_* テストで先端機能を網羅）。
- Python: 必要に応じ `pytest`（用意されていれば）。
- ロード/性能: `locustfile.py`, `docs/BENCHMARKS.md` などを参照。

---
## 11. デプロイのヒント
- **本番起動**: `start-server.ts` または `scripts/start-server.*`。
- **FastAPI 分離**: `scripts/start-fastapi.*`。
- **リバプロ**: `deploy/nginx.conf.example` をベースに HTTPS/TLS 終端。
- **監視**: Prometheus スクレイプ対象に `/metrics` を設定。Grafana ダッシュボードを `monitoring/` で管理。

---
## 12. 学習ルート（推奨順）
1. `README.md` → `docs/GETTING_STARTED.md`
2. `src/index.ts` と `.internal/secure/auth/*` をざっと読む
3. `python/fastapi_server.py` で RAG の流れを確認
4. `public/index.html` の SSE 受信を追う
5. 余裕があれば `rust/TEXTBOOK.md` でネットワークスタックを学ぶ

---
## 13. よく使うコマンド（抜粋）
```bash
# 依存導入
bun install

# 開発起動（FastAPI→Elysia）
bun run dev

# Lint/Format
bun run lint
bun run format

# Rust テスト
cargo test --test advanced_integration_test
cargo test --test advanced_features_test
```

---
## 14. 変更を加えるときのチェックリスト
- 型安全: `t.Object` でリクエストバリデーション
- 認証: JWT ミドルウェアを迂回しない
- レート制限: Redis ダウン時フォールバックを残す
- 観測: 新ルートでも監査ログ/メトリクスを忘れない
- セキュリティ: XSS/SQLi サニタイズ（`sanitize-html`, `containsDangerousKeywords`）
- ドキュメント: 新機能は `docs/` か `README` に追記

---
本教科書を起点に、Elysia AI の全レイヤーを素早く把握し、開発・運用・学習を進めてください。💜
