# 更新履歴 (CHANGELOG): ElysiaAI

このプロジェクトにおける重要な変更点はすべてこのファイルに記録されます。
フォーマットは [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) に基づいています。

## [0.3.0] - 2026-04-27
### 🛡️ セキュリティ & プライバシー (Resonance アップグレード)
- **高度な暗号化 (AES-256-GCM)**: 
  - 暗号化エンジンを CBC から **GCM (Galois/Counter Mode)** へ、スタック全体（Node.js & Python）でアップグレード。
  - データの秘匿性だけでなく、**完全性（改ざん検知）**を保証。
  - JS と Python 間で `scrypt` 鍵導出関数（KDF）のパラメータ（`N=16384, r=8, p=1`）を同期。
- **主権記憶の暗号化 (Sovereign Memory Encryption)**:
  - **Milvus Lite** の記憶内容に対する透過的暗号化を実装。長期記憶（Engrams）は保存時に常に保護されます。
  - **音声ログ**および**アクションログ**の暗号化をデータベース層で実装し、対話内容が平文で保存されることを防止。
- **Black ICE プロトコル (Shield Agent)**:
  - Rust 製 **Shield Agent** にリアルタイムのプロンプトインジェクション検知機能を追加。
  - 「指示の無視（ignore previous instructions）」などのジェイルブレイク・パターンをブロックするセマンティック検証を導入。
  - エージェントの設定を環境変数（`SHIELD_LOG_FILE`, `SHIELD_RULES_FILE`）で動的に変更可能に改善。

### 🏗️ インフラ & CI/CD
- **Prisma スキーマの同期**:
  - `schema.prisma` を刷新し、多ユーザー設計（`User`, `ChatSession`, `RefreshToken` モデル）を統合。
- **環境横断型 CI/CD**:
  - GitHub Actions に **Python Pytest** の実行ステップを追加。Bun テストと並行して AI カーネルの品質を保証。
  - Python 依存関係の監査（`uv` および `safety` チェック）を CI に導入。
- **管理 CLI (manage.ts)**:
  - Python 仮想環境でのテスト実行をサポート。
  - 設定の集中管理状況やスクリプトの肥大化を監査する `check` コマンドを統合。

### 📝 ドキュメント & UX
- **アーキテクチャ・ホワイトペーパー**: `ARCHITECTURE.md` を更新し、**AbyssRTOS** および **ICE レイヤー**の技術的詳細を追記。
- **デプロイ & ビルドガイド**: **Tauri** によるデスクトップビルド、**Docker Compose** による一括起動、**Rust** バイナリのコンパイル手順を拡充。
- **ロードマップ**: README に Phase 2 (Resonance) および Phase 3 (Transcendence) の明確なマイルストーンを設定。

## [0.2.0] - 2026-04-20
### 🛡️ セキュリティ & インテリジェンス
- **Shield Agent**: ログの異常を監視する Rust 製脅威検知システムの初期実装。
- **Milvus Lite 統合**: 外部サーバーに依存しない「ローカルファースト」な記憶アーキテクチャへの移行。
- **VOICEVOX サポート**: 表情豊かな応答を実現するため、ローカルでの日本語音声合成を統合。
- **ターミナル演出**: マネジメント CLI に色鮮やかな星空・流星アニメーションを追加。
- **YARA 統合**: Python によるパターンハンター（Phase 220）の展開。
- **Sysmon 整合**: 強化された監査設定（Phase 221）の生成。

## [0.1.0] - 2026-04-10
### 🚀 初期覚醒 (Initial Awakening)
- **プロジェクト創世**: Core ElysiaJS サーバーおよび FastAPI AI カーネルの公開。
- **AbyssRTOS コンセプト**: 初期アーキテクチャおよび設計思想の発表。
- **Sovereign Mesh**: 主権メッシュ・インテリジェンス・ネットワーク (SMIN) のオンライン化。
- **AES-256-GCM 統合**: NSA/CIA 標準に準拠した初期セキュリティ強化。
- **Unicode 強化**: すべてのスクリプト出力を UTF-8 に強制。
- **Win32 API ブリッジ**: Win32 API との直接対話を可能にする「Ghost Bridge」の確立。

---
© 2026 Elysia20220909 // ElysiaAI Main
