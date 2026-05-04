# 🚀 ElysiaAI: Getting Started Guide

Welcome to the Sovereign Intelligence experience. Follow these steps to awaken your local ElysiaAI instance.

---

## ⚡ Quick Start (Standard)

For users with **Bun** (v1.1+) and **Python** (v3.11+) already installed:

1. **Clone & Setup**:
   ```bash
   git clone https://github.com/Elysia20220909/ElysiaAI.git
   cd ElysiaAI
   bun scripts/manage.ts setup
   bun scripts/manage.ts setup-python
   ```
2. **Launch**:
   ```bash
   bun scripts/manage.ts dev
   ```
3. **Visit**: [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Environment Specific Setup

### 🐳 Docker (Recommended for Isolation)
ElysiaAI provides a containerized stack for easy deployment.
```bash
# Start all services (Server, Kernel, Milvus)
docker-compose up -d
```
- **Access**: `http://localhost:3000`
- **Note**: Ensure Docker Desktop is running. Local VOICEVOX integration requires the engine to be running on the host or a separate container.

### 🪟 Windows (Native)
Recommended for users who want deep OS integration (VOICEVOX, Desktop notifications).
1. **Security Policy**: Run the setup script to configure correct NTFS permissions for sensitive directories:
   ```powershell
   .\scripts\setup-security.ps1
   ```
2. **VOICEVOX**: Download and run the [VOICEVOX Engine](https://voicevox.hiroshiba.jp/).
3. **Environment**: Ensure `python` and `bun` are in your PATH.

### 🐧 WSL2 (Windows Subsystem for Linux)
The best of both worlds: Linux performance with Windows accessibility.
1. **Networking**: WSL2 uses a virtual network. To access a Windows-hosted VOICEVOX engine, set `VOICEVOX_URL=http://<windows_ip>:50021` in your `.env`.
2. **Dependencies**:
   ```bash
   sudo apt update && sudo apt install libgl1-mesa-glx libglib2.0-0 -y
   ```

### 🐉 Kali Linux (Security Audit Mode)
For security researchers focusing on Sovereign Integrity.
1. **Security Tests**:
   ```bash
   # Install OWASP ZAP and dependencies
   sudo apt install zaproxy
   bun run test:security  # Runs ZAP scan against local instance
   ```
2. **Audit Tools**: Check `docs/SECURITY.md` for specific instructions on running the Alpha Protocol audit suite.

---

## 🛠️ Management Commands

| Command | Description |
| :--- | :--- |
| `bun scripts/manage.ts setup` | Install dependencies and create `.env` |
| `bun scripts/manage.ts dev` | Start development servers (Server & Kernel) |
| `bun scripts/manage.ts dev:ci` | Start lightweight CI mode (AI mocked) |
| `bun scripts/manage.ts test` | Run unified test suite (Bun + Pytest) |
| `bun scripts/manage.ts clean` | Wipe temporary build artifacts |

---

## 🛡️ Security First

- **Identity**: Register at `/auth/register` and get your token at `/auth/token`.
- **Sovereignty**: No data leaves your machine. Check `docs/SECURITY.md` for the Alpha Protocol details.
- **Privacy**: All local RAG memories are stored in `data/milvus/` and are never shared with cloud providers.

---
© 2026 Elysia20220909 // ElysiaAI Main
