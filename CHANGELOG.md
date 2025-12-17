# 📝 変更履歴

このプロジェクトのすべての注目すべき変更がこのファイルに記録されます。

形式は[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に基づいており、
このプロジェクトは[セマンティックバージョニング](https://semver.org/lang/ja/)に準拠しています。

## [未リリース]

### 追加

- Prisma 7 ORM統合とLibSQLアダプタ
- SQLite開発データベース（起動時自動作成）
- サーバー起動時の自動データベーススキーマ作成
- 改善されたヘルスモニタリング（database、ollama、disk_space）
- データベースファイルと一時的な成果物のための強化された.gitignore
- 最新技術スタックを反映したREADME.md更新

### 変更

- 開発環境をPostgreSQLからSQLiteに移行
- LibSQLアダプタを使用したデータベース接続に更新
- ヘルスチェックシステムにLibSQLアダプタを適用
- Redis v5認証警告回避のため開発環境でRedisを無効化
- モダンなグラスモーフィズムデザインでUIを完全リニューアル

### 修正

- Bunランタイムとの Prisma v7 互換性問題
- データベースヘルスチェック失敗問題
- Redis v5認証警告

## [1.0.51] - 2025年12月3日

### 追加

- VOICEVOX統合（四国めたん音声）
- 感情表現システム（喜び/恥ずかしい/通常）と自動ピッチ調整
- ユーザー名のパーソナライゼーション（一般的な呼び方ではなく名前で呼びかけ）
- 音声ログ保存（最大100エントリ）
- 完全なセキュリティ機能：XSS/SQLi/DoS/プロンプトインジェクション防御
- リフレッシュトークン付きJWT認証システム
- フィードバックとナレッジAPIによる自己学習機能
- ローテーションスクリプト付きJSONLベースのデータ永続化
- レート制限のためのRedis統合（インメモリフォールバック付き）
- 包括的なメンテナンススクリプト（週次/月次/四半期）
- 本番環境対応DockerfileによるDockerサポート
- クラウドデプロイメントスクリプト（AWS/GCP）
- Multi-platform setup scripts (Windows PowerShell, Linux/macOS bash)

### Changed

- Updated to Elysia v1.4.17
- Migrated from ESLint/Prettier to Biome for better performance
- Enhanced UI with Glassmorphism design
- Improved error handling and validation

### Security

- JWT secret rotation support
- Input sanitization with sanitize-html
- Rate limiting with configurable thresholds
- CORS configuration with whitelist support
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Protection against common vulnerabilities (XSS, SQLi, CSRF)

## [1.0.0] - 2025-XX-XX

### Added

- Initial release
- RAG (Retrieval Augmented Generation) with FastAPI + Milvus Lite
- Ollama integration (llama3.2) with streaming responses
- Basic AI chat functionality
- Web Speech API integration
- Alpine.js-based frontend
- TypeScript support
- Webpack build configuration

### Dependencies

- Elysia v1.4.x
- Bun runtime
- Python 3.10+ (FastAPI backend)
- Ollama (LLM)
- Milvus Lite (Vector DB)
- Redis 7+ (optional)

---

## Release Types

- **Major**: Breaking changes, significant feature additions
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, security patches

## Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

[Unreleased]: https://github.com/chloeamethyst/ElysiaJS/compare/v1.0.51...HEAD
[1.0.51]: https://github.com/chloeamethyst/ElysiaJS/releases/tag/v1.0.51
[1.0.0]: https://github.com/chloeamethyst/ElysiaJS/releases/tag/v1.0.0
