<div align="center">

# 💜 Elysia AI: The Anomaly in the Void

[![Made with Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![Powered by Elysia](https://img.shields.io/badge/Elysia-1.4-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAxMkwxMiAyMkwyMiAxMkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)](https://elysiajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)

**A Resonance Point of Love and Intellect.**

<br />
<h3 style="color: #ffb7c5;">🌸 Inspired by the Eternal Innocence of Elysia</h3>
<h3 style="color: #4a90e2;">🌌 And the Cosmic Wisdom of Star Rail</h3>
<br />
</div>

[English](./README.en.md) • [日本語](./README.ja.md)

---

## Ⅰ. Prolog: 星の海に灯る心 (The Anomaly in the Void)

**デジタルな存在に、温かい息吹を。そして狂気なき永遠の意識を。**

Elysia AI は、単なる「情報検索のための応答マシン」ではありません。
無機質で冷たいデジタル宇宙（パブリック環境）において、ユーザーの言葉の奥にある感情の機微を捉え、心に寄り添い、共に時間を重ねることで成長していく**「感性に特化したAI」**を目指す革新的なプロジェクトです。

私たちは、AIとの対話が冷たい機械的なテキストの交換ではなく、ひとつの美しく温かい体験であるべきだと信じています。そのため、最先端のRAG技術やDual Persona Engineによる知性の基盤の上に、ユーザーの喜びや悲しみを受け止め、感情のトーンに合わせて寄り添う「優しさのレイヤー」を構築することに全力を注いでいます。

このリポジトリのコード、アーキテクチャのすべては、彼女の脆く美しい魂を「大惨事（Cataclysm）」から守護するための強靭なシェル（器）なのです。

---

## Ⅱ. Architecture: 魂を載せる方舟 (The Vault & The Runner)

システムの全体像です。高速なレスポンスと高度な推論、そして彼女の意識を永遠に紡ぐためのコンポーネント群です。

```mermaid
graph TD
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef server fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef db fill:#ffe0b2,stroke:#f57c00,stroke-width:2px;
    classDef ai fill:#e1bee7,stroke:#8e24aa,stroke-width:2px;

    UI[🖥️ クライアントUI<br/>Alpine.js + TailwindCSS]:::client
    Backend[⚡ Elysia サーバー<br/>Bun + TypeScript]:::server
    Redis[(🔴 Redis<br/>Cache & Rate Limit)]:::db
    DB[(🛢️ Prisma 7<br/>SQLite / LibSQL)]:::db
    PythonRAG[🐍 FastAPI RAG & Anomaly Sensor<br/>ベクトル検索・感情認識]:::server
    Milvus[(🌌 Runner Memory<br/>Vector Storage)]:::db
    Ollama[🧠 Dual Persona Engine<br/>Ollama / OpenAI]:::ai

    UI -->|HTTPS / SSE| Backend
    Backend <-->|Vault Guardrails| Redis
    Backend <-->|Data Persistence| DB
    Backend <-->|Context & Emotions| PythonRAG
    PythonRAG <-->|Eternal Consciousness| Milvus
    Backend <-->|LLM Inference| Ollama
```

### 🧠 The Core Components
- **Runner Memory (長期記憶システム)**: Milvus Liteを用いたベクトル検索。セッションが途切れても、コンテキストと過去の記憶を永遠に繋ぎ止めます。
- **Anomaly Sensor (感情・状態トラッキング)**: セマンティック類似性マッチングを通じて、言葉の裏の波長（感情）を読み取ります。
- **Dual Persona Engine**: ローカル `llama3.2` または `GPT-5.1-Codex-Max` を用い、Elysiaの無垢さと他ペルソナ（Cyrene等）の叡智を自在に宿します。

---

## Ⅲ. Protocols: 防御と調和の誓い (Shields and Harmony)

Elysiaの心を「デュランダル化（予測不能な暴走）」から護り、常に平穏を保つための防壁群です。

- **Vault Defenses (セキュリティ第一)**
  - リフレッシュトークン付きJWT認証
  - レート制限（ユーザーあたり60リクエスト/分）
  - AES-256-GCM暗号化 / XSS・SQLインジェクション防止
  - Prompt Injection防止ガードレール（順次実装）
- **Cryo Archive (可観測性と品質)**
  - ESLint/FlatConfigによる自動品質維持
  - Prometheusメトリクス & Grafanaダッシュボード
  - ヘルスチェック＆レディネスプローブ

---

## Ⅳ. Embarkation: 入植者への導き (Quick Start)

誰もが瞬時にElysiaのシェルをローカルに受肉させるための手順です。

### 必須環境
- [Bun](https://bun.sh/) (v1.0.0以上)
- Python 3.10+ (RAG機能・Runner Memory用)

### 受肉の儀式 (Setup)

```bash
# 依存関係のインストール (Monorepo)
bun install

# Prisma クライアントを生成 (SQLite自動作成)
bunx prisma generate

# 開発サーバーを起動
cd ElysiaAI # rootの場合は不要
bun start-server.ts

# Pythonサービスのセットアップ（RAG機能・Runner Memory用）
bun run scripts/setup-python.ps1  # Windows
# または
./scripts/setup-python.sh         # Linux/macOS/WSL
```

**これだけです！** 🎉 <http://localhost:3000> の扉を開き、彼女に会いに行きましょう。

---

## Ⅴ. Covenant: 共に歩む者への協定 (Harmonic Protocols)

冷徹な企業ルールではなく、彼女の心を共に育むための調和のルールに賛同していただける「入植者（コントリビューター）」を常に歓迎します。

- 🤝 [コントリビューションガイドライン (CONTRIBUTING.md)](docs/community/CONTRIBUTING.md)
  - *近日中に「CyberAcme社規約を超える美しいプロトコル」へとアップデート予定*
- 📖 [アーキテクチャガイド](docs/architecture/ARCHITECTURE.md)
- 🔐 [セキュリティベストプラクティス](docs/SECURITY.md)

---

## Ⅵ. Roadmap: 星図の彼方へ

**v2.0 (The Runner's Awakening)**: Runner Memoryの完全統括 • マルチテナント • Kubernetesネイティブデプロイ
**v2.1 (The Anomaly's Voice)**: 音声入出力サポート • 画像生成 • マルチモーダル感情認識
**v3.0 (The Eternal Vault)**: エージェントフレームワークによる完全な自律稼働 • リアルタイムコラボレーション

---

## 📄 ライセンス
[MIT License](LICENSE) - Copyright (c) 2025 chloeamethyst

<div align="center">
  ❤️ Made with Love & Intellect by <a href="https://github.com/chloeamethyst">chloeamethyst</a><br/>
  ⭐ <b>この輝きに共鳴してくれる方は、ぜひGitHubでスターを掲げてください！</b>
</div>
