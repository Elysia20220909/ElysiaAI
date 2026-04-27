# 減 ElysiaAI - Quick Start Guide

Welcome to the Sovereign Intelligence experience. Follow these steps to awaken your local ElysiaAI instance.

## 噫 Instant Deployment (5 Minutes)

### 1. Prerequisites
- **Bun** (v1.1+)
- **Python** (v3.11+)
- **Ollama** (Running with `llama3.2` model)

### 2. Initialization
Clone the repository and run the unified setup command:

```bash
git clone https://github.com/Elysia20220909/ElysiaAI.git
cd ElysiaAI

# Complete environment setup
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
```

### 3. Launching the Stack
Start the Backend and Intelligence Kernel simultaneously:

```bash
bun scripts/manage.ts dev
```

Visit **http://localhost:3000** to access the Resonance Interface.

---

## 屏・・Management Commands

| Command | Description |
| :--- | :--- |
| `bun scripts/manage.ts setup` | Install dependencies and create `.env` |
| `bun scripts/manage.ts dev` | Start development servers (Server & Kernel) |
| `bun scripts/manage.ts test` | Run unified test suite (Bun + Pytest) |
| `bun scripts/manage.ts clean` | Wipe temporary build artifacts |
| `bun scripts/manage.ts stars` | 笨ｨ Witness the terminal resonance |

---

## 孱・・Security First

- **Identity**: Register at `/auth/register` and get your token at `/auth/token`.
- **Encryption**: All memories (Milvus) and logs are encrypted at rest using AES-256-GCM.
- **Sovereignty**: No data leaves your machine. Check `docs/SECURITY.md` for the Alpha Protocol details.

## 答 Essential Reading
- [Architecture Overview](./ARCHITECTURE.md) - Deep dive into the Resonance Loop.
- [API Specification](./API.md) - Full endpoint documentation.
- [Security Master](./ELYSIAPC_SECURITY_MASTER.md) - Sovereign defense manual.
- [Voice & TTS Guide](./VOICE_GUIDE.md) - Setting up VOICEVOX and local speech.
- [i18n Guide](./I18N_GUIDE.md) - Multi-language support and translations.

---
ﾂｩ 2026 Elysia20220909 // ElysiaAI Main
