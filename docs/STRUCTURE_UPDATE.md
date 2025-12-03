# Project Structure Update - Security Enhancement

## 📁 変更された構造

重要なファイルをより深い階層に移動し、セキュリティを強化しました。

### 新しいディレクトリ構造

```text
elysia-ai/
├── config/
│   └── private/                    # 🔒 機密設定（Git管理外）
│       ├── .env                    # 環境変数
│       ├── .env.example            # テンプレート
│       └── README.md               # 設定ガイド
│
└── src/
    ├── config/
    │   └── internal/               # 🔒 内部設定
    │       └── llm-config.ts       # LLMモデル設定
    │
    ├── core/
    │   └── security/               # 🔒 セキュリティモジュール
    │       ├── index.ts            # エクスポート
    │       ├── jwt.ts              # JWT認証
    │       └── redis.ts            # レート制限
    │
    └── database/
        └── config/                 # 🔒 DB設定
            └── index.ts            # DB接続設定
```

### 移動したファイル

| 元の場所 | 新しい場所 | 理由 |
|---------|----------|------|
| `/.env` | `/config/private/.env` | 機密情報を専用ディレクトリに |
| `/src/llm-config.ts` | `/src/config/internal/llm-config.ts` | 内部設定の隠蔽 |
| `/src/redis.ts` | `/src/core/security/redis.ts` | セキュリティモジュールの集約 |
| （新規） | `/src/core/security/jwt.ts` | JWT機能の分離 |
| （新規） | `/src/database/config/index.ts` | DB設定の集中管理 |

## 🔄 影響を受けるファイル

以下のファイルのインポートパスが更新されました:

### `src/index.ts`
```typescript
// 変更前
import { DEFAULT_MODE, ELYSIA_MODES } from "./llm-config";
import { ... } from "./redis";

// 変更後
import { DEFAULT_MODE, ELYSIA_MODES } from "./config/internal/llm-config";
import { ... } from "./core/security";
import { DATABASE_CONFIG } from "./database/config";
```

## 🛡️ セキュリティ改善点

1. **多層防御**: 機密ファイルを深い階層に配置
2. **明確な分離**: 設定の種類ごとにディレクトリを分離
3. **Git除外**: 重要なディレクトリを `.gitignore` に追加
4. **モジュール化**: セキュリティ機能を1箇所に集約

## 📋 開発者向け: 移行手順

### 既存プロジェクトの更新

既存の開発環境を更新する場合:

```bash
# 1. 環境変数ファイルの移動
mkdir -p config/private
mv .env config/private/.env 2>/dev/null || true

# 2. 依存関係の再インストール
bun install

# 3. ビルド確認
bun run build

# 4. 起動テスト
bun run dev
```

### 新規セットアップ

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd elysia-ai

# 2. 環境変数の設定
cp config/private/.env.example config/private/.env
# エディタで .env を編集

# 3. 依存関係のインストール
bun install

# 4. 起動
bun run dev
```

## ⚠️ 注意事項

### Gitコミット前の確認

コミット前に以下を確認してください:

```bash
# 機密ファイルが含まれていないか確認
git status

# 以下のディレクトリが表示されないことを確認
# - config/private/
# - src/config/internal/
# - src/core/security/
# - src/database/config/
```

### 環境変数の管理

- **開発環境**: `config/private/.env`
- **本番環境**: クラウドのシークレット管理サービスを使用
  - AWS Secrets Manager
  - Azure Key Vault
  - GCP Secret Manager

## 📚 関連ドキュメント

- [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) - セキュリティアーキテクチャ詳細
- [SECURITY.md](../SECURITY.md) - セキュリティポリシー
- [config/private/README.md](../config/private/README.md) - 環境変数設定ガイド

## 🔍 トラブルシューティング

### インポートエラーが発生する場合

```typescript
// エラー: Cannot find module './llm-config'
// 修正: パスを更新
import { ... } from "./config/internal/llm-config";
```

### 環境変数が読み込めない場合

1. `.env` ファイルの場所を確認:
   ```bash
   ls config/private/.env
   ```

2. ファイルが存在しない場合は作成:
   ```bash
   cp config/private/.env.example config/private/.env
   ```

3. 環境変数の読み込みを確認:
   ```bash
   bun run --print 'console.log(process.env.PORT)'
   ```

## 📞 サポート

問題が発生した場合:

1. [Issues](https://github.com/chloeamethyst/ElysiaJS/issues) で既存の問題を検索
2. 新しいissueを作成（機密情報は含めないこと）
3. セキュリティ上の問題は [SECURITY.md](../SECURITY.md) の手順に従って報告
