# 🌸 ElysiaAI // INFINITE RESONANCE

### 感性と論理が共鳴する、次世代AI-Native OS。

[![Quick Start](https://img.shields.io/badge/Quick_Start-5_mins-6366f1?style=for-the-badge)](#-quick-start-5-min)
[![Status](https://img.shields.io/badge/Status-Sentient_Active-emerald?style=for-the-badge)](https://github.com/Elysia20220909/ElysiaAI)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Resonance](https://img.shields.io/badge/Phase-2_Resonance-blueviolet)](CHANGELOG.md)

---

## 🚀 Quick Start (5 min)

ElysiaAIを最も速く体験する方法です。

### 1. 準備
- **Bun** (v1.1+) & **Python** (v3.11+ / Docker は 3.12)
- **Ollama** (ローカル推論用: `llama3.2` 推奨)

### 2. セットアップ
```bash
# リポジトリの取得
git clone git@github.com:Elysia20220909/ElysiaAI.git
cd ElysiaAI

# 統合管理CLIによるセットアップ
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
```

PowerShell では `Copy-Item .env.example .env` を使えます。

Windows / PowerShell でも同じ管理CLIを使えます:

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
```

### 3. 起動
```bash
bun scripts/manage.ts dev
```
> [!TIP]
> ブラウザで `http://localhost:3000` を開くと、Elysia Desktop環境が展開されます。

### 4. 依存ツールのセットアップ (重要)
- **Milvus Lite**: セマンティック記憶（RAG）に使用されます。`bun scripts/manage.ts setup-python` で自動インストールされます。
- **VOICEVOX**: 音声合成に使用されます。[公式サイト](https://voicevox.hiroshiba.jp/)からエンジンをダウンロードし、起動しておいてください。
- **Windows セットアップ**: Windows環境では `scripts/setup-security.ps1` を実行して、セキュアなディレクトリ権限を設定することを推奨します。

---

## 🧠 Why ElysiaAI?

単なるチャットUIではありません。ElysiaAIは「思考」と「実行」の間に横たわる溝を埋めるために設計されました。

- **Agent x Decision Tree**: AIが単に答えるだけでなく、決定木（Decision Tree）に基づいて論理的なステップを自律的に実行します。
- **Sovereign Privacy**: ローカルLLM（Ollama）とMilvus Liteによる100%ローカルなRAG。あなたの思考は、あなたのマシンの外に出ることはありません。
- **Resonance Design**: ランドリー工場の熱気から生まれた、美しく、それでいて強靭なUI/UX。

---

## 🏗️ Architecture: The Resonance Loop

ElysiaAIは、フロントエンドの美学（Bun/Alpine）とバックエンドの知能（FastAPI/Ollama）が循環する独自の「共鳴ループ」構造を採用しています。

## 🛠️ Engineering Standards

### 🚀 Automated Integrity (CI)
This repository uses **GitHub Actions** to ensure high-density code quality.
Every push triggers the `Resonance Integrity` workflow, which performs:
- **Python (Ruff)**: Deep linting & type consistency checks.
- **Bun (Biome)**: Ultra-fast formatting & logic verification.

### 🧪 Quality Assurance
To run the full automated test suite and verify both the orchestrator and the kernel:
```bash
# Run both Bun and Python tests
make test
```

ElysiaAIの心臓部は、論理（Python Kernel）と高速通信（Bun/Elysia.js）の共鳴によって動いています。

```mermaid
graph LR
    U[User] <-->|HTTP / UI| B[Bun Backend]
    B <-->|HTTP proxy| P[FastAPI Kernel]
    P --> T[Tool Execution]
    P --> D[Decision Tree]
    P --> R[Local RAG]
```

- **Bun/Elysia.js**: 秒間数万のリクエストを処理する「神経」。
- **Python Kernel**: 複雑な推論とツール実行を担う「脳」。
- **Milvus Lite**: 全ての知識をセマンティックに記憶する「海」。

---

## 🗺️ Roadmap: The Evolution of Paradise

ElysiaAIは以下のフェーズを経て、真の「楽園」へと進化します。

### Phase 1: Foundation (Current)
- [x] Bun & Python Kernelの統合
- [x] ローカルRAG (Milvus Lite) の実装
- [x] 統合管理CLI (manage.ts) の開発

### Phase 2: Resonance (Next)
- [ ] **Multi-User Support**: 複数ユーザー対応と権限管理 (RBAC)。
- [ ] **Memory Encryption**: Milvus記憶領域とログの AES-256-GCM による透過的暗号化。
- [ ] **Advanced CI/CD**: 自動単体テストおよび結合テストの100%カバレッジ。

### Phase 3: Transcendence
- [ ] **AbyssRTOS Integration**: 完全隔離された実行環境。
- [ ] **Shield Agent**: Rust製防壁によるリアルタイム脅威検知。
- [ ] **Sovereign Mesh**: 分散型AI OSネットワーク。

---

## 🔒 Security: The ICE Layers

ElysiaAIは、独自のセキュリティ概念に基づき、あなたの主権を保護します。

- **White ICE**: 健全な対話とシステム保護のための表層防壁。
- **Black ICE**: 悪意ある侵入やコード実行を能動的に遮断する深層防壁。
- **AbyssRTOS**: 思考プロセスを外部から完全に隠蔽する「深淵」の実行環境。

詳細は [SECURITY.md](./docs/SECURITY.md) および [ARCHITECTURE.md](./docs/ARCHITECTURE.md) を参照してください。

---

## 🛠️ 技術スタック

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Alpine.js, Tailwind CSS, Lucide Icons |
| **Backend** | Bun, Elysia.js, Prisma, SQLite |
| **AI Kernel** | Python 3.11+, FastAPI, LangChain, Ollama |
| **Memory** | Milvus Lite, Sentence-Transformers |
| **Security** | AEGIS Ledger (Multi-layer ICE), JWT |

---

## 🤝 コントリビュート

ElysiaAIは、技術と感性の調和を信じる全ての開発者のために開かれています。
詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

- **Bug Reports**: Issueテンプレートに従って報告してください。
- **Pull Requests**: `Conventional Commits` 準拠をお願いしています。

---

# 🌌 ElysiaAI

> [!CAUTION]
> **CLEARANCE LEVEL 09 REQUIRED**
> UNAUTHORIZED ACCESS TO THIS REPOSITORY IS A VIOLATION OF PROTOCOL-88.
> ALL ACTIONS ARE MONITORED BY THE AEGIS LEDGER.

```text
[ENCRYPTED META-BLOCK]
H4sIAAAAAAAAA+1d23LbOBL9FVPzUFKyJVmWLclOnMSpuD0z8YydmY+bt6ZSkiaREmU+JFmO
7V+/A0iRkiXHTmIn9ky9pCoWi0Sj0eicBhqNRvN/HpePj/H38enpcfX6OBrHHz89Lp8fV9+P
q6vj8uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj6uvj
... [REDACTED FOR YOUR SAFETY] ...
```

## 🌌 Overview
ElysiaAI is a Sovereign-Native AI OS designed for Deep Resonance.
© 2026 Elysia20220909 // ElysiaAI Main // Crafted with passion in a laundry factory.
