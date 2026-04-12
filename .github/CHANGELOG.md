# 📝 変更履歴

このプロジェクトのすべての注目すべき変更がこのファイルに記録されます。

形式は[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に基づいており、
このプロジェクトは[セマンティックバージョニング](https://semver.org/lang/ja/)に準拠しています。

## [3.1.0-NC] - 2026-04-08
### Added
- **Project NIGHT CITY (Cyberpunk 2077 Thematic Overhaul)**:
    - **Visual Metamorphosis**: `Orbitron` フォント、`NIGHT CITY YELLOW` / `ARASAKA RED` の配色、グリッチ・アニメーションによる没入型インターフェース。
    - **Cyber HUD**: 走査線（Scanlines）オーバーレイとデジタル・ブルータリズムに基づいたウィンドウ・ドックデザイン。
    - **Arasaka-style Diagnostics**: `System Doctor` の出力をディストピアなハッキングログ形式（ICE_CHECK, NET_SYNC）へ刷新。
- **Resilience Upgrade**: 依存ライブラリの欠落時における STT サービスの例外処理と UI への警告通知を強化。

## [3.0.1] - 2026-04-08
### Fixed
- 入出力エラーの防止: `faster-whisper` 等の重量級ライブラリ未インストール時のフォールバック処理を強化。
- 依存関係の修正: FastAPI でのファイルアップロードに必要な `python-multipart` を要求定義に追加。
- システム診断の深度化: `Makefile` の `make check` にて Python ライブラリの存在確認を自動化。

## [3.0.0-SOVEREIGN] - 2026-04-08

### [3.0.0-SOVEREIGN] 追加
- **主権知性の完成 (Sovereign Core)**:
    - **視覚知覚 (The Sight)**: `capture_screen` スキルを実装。エリシアがデスクトップの状態を「見て」理解することが可能に。
    - **魂の共鳴 (Soul Memory)**: `var/elysia/soul.json` による深層記憶システム。ユーザーの長期的な好みや感情的コンテキストを永久保存。
    - **能動的通知 (Proactive UI)**: フローティング・トースト通知システムを搭載。AI が能動的にユーザーへ気遣いや警告を届けられる。
- **コネクテッド・エコシステム (World Horizon)**:
    - **Web 探索機能**: DuckDuckGo 検索と URL 解析スキルにより、外部知性を統合。
    - **開発リポジトリ認識**: Git スキルにより、自分自身のソースコードと履歴を把握。
- **ネイティブ OS 基盤**:
    - **Rust オーケストレーション**: Tauri 側で Python カーネルのライフサイクルを完全管理。

## [2.6.0-RESONANCE] - 2026-04-08

### [2.6.0-RESONANCE] 追加
- **核となる知性の進化 (Soul of Elysia)**:
    - **真のマルチエージェント基盤**: `delegate` スキルにより、セキュリティ、デバッグ、クリエイティブ、システム監査の専門家をリアルタイムに召喚し、再帰的な推論を実行可能に。
    - **高度な知覚 (The Ear)**: `faster-whisper` による完全ローカル・プライバシー重視の音声文字起こし（STT）機能を搭載。マイクボタン一つで声による対話が可能。
    - **設定の動的同期 (Resonance Sync)**: フロントエンドの設定をサーバー側の `etc/elysia/config.json` に即座に永続化する双方向シンク機能を実装。
- **アーキテクチャの刷新 (OS Foundations)**:
    - **アプリの外部モジュール化**: `desktop.html` の巨大なモノリスを解体し、アプリケーションを `/system/apps` から動的にロードする UNIX ライクな構造へ変換。
    - **Tauri v2 による独立アプリ化**: ブラウザに依存しない、完全なスタンドアロンデスクトップアプリケーションとしてのビルド構成を完了。

### [2.6.0-RESONANCE] 変更
- `kernel.py` を FastAPI ベースの軽量かつ拡張性の高い設計に全面刷新。
- `requirements.txt` を軽量化し、OS ネイティブ動作に最適化。

## [1.1.0] - 2026-03-13

### [1.1.0] 追加

- **モバイルアプリ強化 (The "Elysia Love" Update)**:
  - `@gorhom/bottom-sheet` を利用したプレミアムな設定UIの統合
  - `react-native-markdown-display` によるAIメッセージのリッチテキスト表示
  - `useChat` カスタムフックによる、通信ロジックとUIの完全分離
  - サーバー接続失敗時のユーザー向けアラート通知
  - 「考え中」状態へのふわふわとしたフェードアニメーションの追加
- **リポジトリ品質向上 (Senior Maintainer Audit)**:
  - `ARCHITECTURE.md` (Mermaid図解付) および `SECURITY.md` の新規作成
  - `elysia-helmet` による強力なHTTPセキュリティヘッダーの導入
  - `elysia-compress` によるレスポンス圧縮通信のサポート

### [1.1.0] 変更

- `biome.json` をアーキテクチャ設計に基づき `config/internal/` へ移動
- GitHub Actions (CI/CD) のアクションを特定のSHAに固定し、CodeQL解析を追加

## [1.0.51] - 2025-12-03

### [1.0.51] 追加

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
- 本番環境対応Dockerfileによる Dockerサポート
- クラウドデプロイメントスクリプト（AWS/GCP）
- Multi-platform setup scripts (Windows PowerShell, Linux/macOS bash)

### [1.0.51] 変更

- Updated to Elysia v1.4.17
- Migrated from ESLint/Prettier to Biome for better performance
- Enhanced UI with Glassmorphism design
- Improved error handling and validation

### [1.0.51] セキュリティ

- JWT secret rotation support
- Input sanitization with sanitize-html
- Rate limiting with configurable thresholds
- CORS configuration with whitelist support
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Protection against common vulnerabilities (XSS, SQLi, CSRF)

## [1.0.0] - 2025-XX-XX

### [1.0.0] 追加

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

[1.1.0]: https://github.com/chloeamethyst/ElysiaJS/compare/v1.0.51...v1.1.0
[1.0.51]: https://github.com/chloeamethyst/ElysiaJS/releases/tag/v1.0.51
[1.0.0]: https://github.com/chloeamethyst/ElysiaJS/releases/tag/v1.0.0
