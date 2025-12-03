# Security Architecture Documentation

## 🔒 Protected Directory Structure

このプロジェクトでは、セキュリティを強化するために重要なファイルを深い階層に配置しています。

### 機密情報の配置

#### 1. `/config/private/` - 環境変数と認証情報
```
config/private/
├── .env              # 本番環境変数（Git管理外）
├── .env.example      # 環境変数テンプレート
└── README.md         # 設定ガイド
```

**含まれる情報:**
- API キー、シークレット
- データベース接続文字列
- 認証パスワード

**アクセス制御:**
- `.gitignore` で完全に除外
- 読み取り権限を最小限に制限

#### 2. `/src/config/internal/` - 内部設定
```
src/config/internal/
└── llm-config.ts     # LLMモデル設定とプロンプト
```

**含まれる情報:**
- システムプロンプト
- モデルパラメータ
- キャラクター設定

#### 3. `/src/core/security/` - セキュリティモジュール
```
src/core/security/
├── index.ts          # エクスポート集約
├── jwt.ts            # JWT認証ロジック
└── redis.ts          # Redis接続とレート制限
```

**含まれる機能:**
- トークン生成・検証
- リフレッシュトークン管理
- レート制限制御

#### 4. `/src/database/config/` - データベース設定
```
src/database/config/
└── index.ts          # DB接続設定
```

**含まれる情報:**
- Milvus接続情報
- RAG API エンドポイント
- Redis設定

## 🛡️ セキュリティ対策

### 多層防御アーキテクチャ

1. **ファイルシステムレベル**
   - 深い階層構造による可視性の低下
   - `.gitignore` による厳格な除外

2. **アプリケーションレベル**
   - 環境変数による設定の外部化
   - モジュール化による責任分離

3. **ネットワークレベル**
   - CORS設定
   - レート制限
   - JWT認証

### Git管理からの除外

`.gitignore` に以下を追加:
```gitignore
/config/private/
/src/config/internal/
/src/core/security/
/src/database/config/
```

## 📝 開発者向けガイド

### 初回セットアップ

1. 環境変数ファイルの作成:
```bash
cp config/private/.env.example config/private/.env
```

2. `.env` ファイルを編集して実際の値を設定

3. セキュリティモジュールが正しく読み込まれることを確認:
```bash
bun run dev
```

### 新しい機密情報の追加

機密情報を追加する場合:

1. **環境変数** → `config/private/.env`
2. **内部ロジック** → `src/core/` または `src/config/internal/`
3. **DB設定** → `src/database/config/`

### セキュリティチェックリスト

- [ ] `.env` ファイルをGitにコミットしていないか
- [ ] ハードコードされた認証情報がないか
- [ ] APIキーがログに出力されていないか
- [ ] 本番環境で適切な環境変数を使用しているか

## ⚠️ 警告

以下のディレクトリを **絶対に公開リポジトリにpushしないでください**:

- `config/private/`
- 本番環境の `.env` ファイル
- 実際のAPIキーや認証情報

## 🔐 本番環境デプロイ

本番環境では:

1. 環境変数を安全なシークレット管理サービスで管理
   - AWS Secrets Manager
   - Azure Key Vault
   - GCP Secret Manager

2. ファイルベースの設定は使用しない

3. 定期的なキーのローテーション

4. アクセスログの監視
