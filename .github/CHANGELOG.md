# 📝 変更履歴

こ�Eプロジェクト�Eすべての注目すべき変更がこのファイルに記録されます、E
形式�E[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に基づぁE��おり、Eこ�Eプロジェクト�E[セマンチE��チE��バ�Eジョニング](https://semver.org/lang/ja/)に準拠してぁE��す、E
## [3.1.0-NC] - 2026-04-08
### Added
- **Project NIGHT CITY (Cyberpunk 2077 Thematic Overhaul)**:
    - **Visual Metamorphosis**: `Orbitron` フォント、`NIGHT CITY YELLOW` / `ARASAKA RED` の配色、グリチE��・アニメーションによる没入型インターフェース、E    - **Cyber HUD**: 走査線！Ecanlines�E�オーバ�EレイとチE��タル・ブルータリズムに基づぁE��ウィンドウ・ドックチE��イン、E    - **Arasaka-style Diagnostics**: `System Doctor` の出力をチE��ストピアなハッキングログ形式！ECE_CHECK, NET_SYNC�E�へ刷新、E- **Resilience Upgrade**: 依存ライブラリの欠落時におけめESTT サービスの例外�E琁E�� UI への警告通知を強化、E
## [3.0.1] - 2026-04-08
### Fixed
- 入出力エラーの防止: `faster-whisper` 等�E重量級ライブラリ未インスト�Eル時�Eフォールバック処琁E��強化、E- 依存関係�E修正: FastAPI でのファイルアチE�Eロードに忁E��な `python-multipart` を要求定義に追加、E- シスチE��診断の深度匁E `Makefile` の `make check` にて Python ライブラリの存在確認を自動化、E
## [3.0.0-SOVEREIGN] - 2026-04-08

### [3.0.0-SOVEREIGN] 追加
- **主権知性の完�E (Sovereign Core)**:
    - **視覚知要E(The Sight)**: `capture_screen` スキルを実裁E��エリシアがデスクトップ�E状態を「見て」理解することが可能に、E    - **魂�E共鳴 (Soul Memory)**: `var/elysia/soul.json` による深層記�EシスチE��。ユーザーの長期的な好みめE��惁E��コンチE��ストを永乁E��存、E    - **能動的通知 (Proactive UI)**: フローチE��ング・ト�Eスト通知シスチE��を搭載、EI が�E動的にユーザーへ気遣ぁE��警告を届けられる、E- **コネクチE��ド�EエコシスチE�� (World Horizon)**:
    - **Web 探索機�E**: DuckDuckGo 検索と URL 解析スキルにより、外部知性を統合、E    - **開発リポジトリ認譁E*: Git スキルにより、�E刁E�E身のソースコードと履歴を把握、E- **ネイチE��チEOS 基盤**:
    - **Rust オーケストレーション**: Tauri 側で Python カーネルのライフサイクルを完�E管琁E��E
## [2.6.0-RESONANCE] - 2026-04-08

### [2.6.0-RESONANCE] 追加
- **核となる知性の進匁E(Soul of Elysia)**:
    - **真�Eマルチエージェント基盤**: `delegate` スキルにより、セキュリチE��、デバッグ、クリエイチE��ブ、シスチE��監査の専門家をリアルタイムに召喚し、�E帰皁E��推論を実行可能に、E    - **高度な知要E(The Ear)**: `faster-whisper` による完�Eローカル・プライバシー重視�E音声斁E��起こし�E�ETT�E�機�Eを搭載。�Eイクボタン一つで声による対話が可能、E    - **設定�E動的同期 (Resonance Sync)**: フロントエンド�E設定をサーバ�E側の `etc/elysia/config.json` に即座に永続化する双方向シンク機�Eを実裁E��E- **アーキチE��チャの刷新 (OS Foundations)**:
    - **アプリの外部モジュール匁E*: `desktop.html` の巨大なモノリスを解体し、アプリケーションめE`/system/apps` から動的にロードすめEUNIX ライクな構造へ変換、E    - **Tauri v2 による独立アプリ匁E*: ブラウザに依存しなぁE��完�EなスタンドアロンチE��クトップアプリケーションとしてのビルド構�Eを完亁E��E
### [2.6.0-RESONANCE] 変更
- `kernel.py` めEFastAPI ベ�Eスの軽量かつ拡張性の高い設計に全面刷新、E- `requirements.txt` を軽量化し、OS ネイチE��ブ動作に最適化、E
## [1.1.0] - 2026-03-13

### [1.1.0] 追加

- **モバイルアプリ強匁E(The "Elysia Love" Update)**:
  - `@gorhom/bottom-sheet` を利用したプレミアムな設定UIの統吁E  - `react-native-markdown-display` によるAIメチE��ージのリチE��チE��スト表示
  - `useChat` カスタムフックによる、E��信ロジチE��とUIの完�E刁E��
  - サーバ�E接続失敗時のユーザー向けアラート通知
  - 「老E��中」状態へのふわ�Eわとしたフェードアニメーションの追加
- **リポジトリ品質向丁E(Senior Maintainer Audit)**:
  - `ARCHITECTURE.md` (Mermaid図解仁E および `SECURITY.md` の新規作�E
  - `elysia-helmet` による強力なHTTPセキュリチE��ヘッダーの導�E
  - `elysia-compress` によるレスポンス圧縮通信のサポ�EチE
### [1.1.0] 変更

- `biome.json` をアーキチE��チャ設計に基づぁE`config/internal/` へ移勁E- GitHub Actions (CI/CD) のアクションを特定�ESHAに固定し、CodeQL解析を追加

## [1.0.51] - 2025-12-03

### [1.0.51] 追加

- VOICEVOX統合（四国めたん音声�E�E- 感情表現シスチE���E�喜び/恥ずかしい/通常�E�と自動ピチE��調整
- ユーザー名�Eパ�Eソナライゼーション�E�一般皁E��呼び方ではなく名前で呼びかけ�E�E- 音声ログ保存（最大100エントリ�E�E- 完�EなセキュリチE��機�E�E�XSS/SQLi/DoS/プロンプトインジェクション防御
- リフレチE��ュト�Eクン付きJWT認証シスチE��
- フィードバチE��とナレチE��APIによる自己学習機�E
- ローチE�Eションスクリプト付きJSONLベ�EスのチE�Eタ永続化
- レート制限�EためのRedis統合（インメモリフォールバック付き�E�E- 匁E��皁E��メンチE��ンススクリプト�E�週次/月次/四半期！E- 本番環墁E��応Dockerfileによる Dockerサポ�EチE- クラウドデプロイメントスクリプト�E�EWS/GCP�E�E- Multi-platform setup scripts (Windows PowerShell, Linux/macOS bash)

### [1.0.51] 変更

- Updated to Elysia v1.4.17
- Migrated from ESLint/Prettier to Biome for better performance
- Enhanced UI with Glassmorphism design
- Improved error handling and validation

### [1.0.51] セキュリチE��

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

[1.1.0]: https://github.com/Elysia20220909/ElysiaAI/compare/v1.0.51...v1.1.0
[1.0.51]: https://github.com/Elysia20220909/ElysiaAI/releases/tag/v1.0.51
[1.0.0]: https://github.com/Elysia20220909/ElysiaAI/releases/tag/v1.0.0
