# Elysia AI ビギナー教科書（最短で動かす編）

「とりあえず動かしながら全体像を掴みたい」人向けの超コンパクトガイドです。詳細な体系版は `docs/REPO_TEXTBOOK.md`、ネットワーク教材は `rust/TEXTBOOK.md` を参照してください。

---
## 1. まず動かす 5 ステップ（10分）

1. 依存インストール

    ```bash
    bun install
    ```

2. Python RAG のセットアップ

    ```bash
    bun run scripts/setup-python.ps1   # Windows
    ./scripts/setup-python.sh          # Linux/macOS/WSL
    ```

3. 環境変数テンプレートをコピー

    ```bash
    cp .env.example .env   # PowerShell なら: copy .env.example .env
    ```

4. `.env` の最低限を確認/編集

    - `JWT_SECRET`, `JWT_REFRESH_SECRET`: 適当な長い文字列
    - `OLLAMA_MODEL`: 例) `llama3.2`
    - `OLLAMA_HOST`: 例) `http://localhost:11434`
    - `RAG_API_URL`: 例) `http://localhost:8000`
    - Redis/Milvus はなくても開発は開始可能（該当機能を使うときに設定）

5. サービス起動（FastAPI → Elysia）

    ```bash
    bun run dev
    ```

    ブラウザで <http://localhost:3000> を開き、チャットできれば成功。APIは <http://localhost:3000/swagger> から確認できます。

---

## 2. 仕組みをざっくり

```text
Web UI (public/) ──HTTPS/SSE──> Elysia (src/) ──> FastAPI RAG (python/)
                                   │             └─> Milvus / Embedding
                                   ├─> Redis (rate limit / cache)
                                   └─> Ollama (LLM 推論) → ストリーミング返信
```

---

## 3. どのファイルから読むか（最短ルート）

1. `README.md` → プロジェクト概要とコマンド
2. `src/index.ts` → ルーティングとミドルウェア
3. `python/fastapi_server.py` → RAG の入口
4. 余裕があれば `public/index.html` で SSE の受信を確認

---

## 4. よく使う最小コマンド

```bash
bun run dev          # 開発起動（FastAPI→Elysia）
```

bun run format       # フォーマット

# Rust 教材のテスト（任意）
---
cargo test --test advanced_features_test
```

---

## 5. よくあるつまづきと対処

- **Ollama が起動していない**: `OLLAMA_HOST` のポート確認、モデルを `ollama pull` で取得。
- **Milvus 未セットアップ**: まずは Milvus なしで開始可。必要になったら `USE_MILVUS` と接続先を設定。
- **Redis 未接続**: レート制限は Redis ダウン時に許可フォールバックする設計。開発初期は未設定でも進行可。
- **ポート衝突**: Elysia (3000), FastAPI (8000), Ollama (11434 デフォルト)。空きポートを確認。

---

## 6. 次の一歩

- 体系的に理解したい: `docs/REPO_TEXTBOOK.md`
- ネットワーク実装を学ぶ: `rust/TEXTBOOK.md`
- カスタム設定・デプロイ: `docs/DEPLOYMENT_GUIDE.md`, `deploy/nginx.conf.example`

楽しんで開発しましょう！💜
## 3. どのファイルから読むか（最短ルート）
1. `README.md` → プロジェクト概要とコマンド
2. `src/index.ts` → ルーティングとミドルウェア
3. `python/fastapi_server.py` → RAG の入口
4. 余裕があれば `public/index.html` で SSE の受信を確認

---
## 4. よく使う最小コマンド
```bash
bun run dev          # 開発起動（FastAPI→Elysia）
bun test             # TypeScript テスト（必要に応じて）
bun run lint         # Lint
bun run format       # フォーマット

# Rust 教材のテスト（任意）
cargo test --test advanced_integration_test
cargo test --test advanced_features_test
```

---
## 5. よくあるつまづきと対処
- **Ollama が起動していない**: `OLLAMA_HOST` のポート確認、モデルを `ollama pull` で取得。
- **Milvus 未セットアップ**: まずは Milvus なしで開始可。必要になったら `USE_MILVUS` と接続先を設定。
- **Redis 未接続**: レート制限は Redis ダウン時に許可フォールバックする設計。開発初期は未設定でも進行可。
- **ポート衝突**: Elysia (3000), FastAPI (8000), Ollama (11434 デフォルト)。空きポートを確認。

---
## 6. 次の一歩
- 体系的に理解したい: `docs/REPO_TEXTBOOK.md`
- ネットワーク実装を学ぶ: `rust/TEXTBOOK.md`
- カスタム設定・デプロイ: `docs/DEPLOYMENT_GUIDE.md`, `deploy/nginx.conf.example`

楽しんで開発しましょう！💜
