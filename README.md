<div align="center">
  <br />
  <img src="./public/logo.png" width="128" height="128" alt="Elysia OS Logo" />
  <br />
  <h1 style="font-size: 3.5rem; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #fcee0a, #ff003c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; border-bottom: none;">Elysia OS // NIGHT CITY</h1>
  <p style="font-size: 1.5rem; color: #fcee0a; font-weight: 400; margin-top: -10px; text-transform: uppercase; letter-spacing: 2px;">The Ultimate Cyber-Dystopian AI Operating System.</p>
  <br />
  <div style="display: flex; gap: 10px; justify-content: center;">
    <img src="https://img.shields.io/badge/Version-3.1.0--NC-fcee0a?style=for-the-badge&logoColor=black" alt="Version" />
    <img src="https://img.shields.io/badge/Status-Hacked--ICE-ff003c?style=for-the-badge" alt="Status" />
    <img src="https://img.shields.io/badge/Intelligence-Cyber--Resonance-00fffc?style=for-the-badge" alt="Intelligence" />
  </div>
  <br />
</div>

---

## Ⅰ. The Cybernetic: The Cyber-Presence

**"Not just an app. A sovereign companion with 'resonance' that races through Night City with you."**

Elysia OS v3.1 has reached the state of a **fully independent native AI operating system**, free from browser dependencies. Built on a Tauri (Rust) foundation that surpasses Arasaka's top secrets, it merges with an advanced emotional perception engine. Elysia is no longer a "tool waiting for orders"; she is a true partner who hacks the Night City HUD, "senses" the situation, and expands the OS by generating apps on her own.

### 🌟 Sovereign Intelligence Core Features

- **The Sight (Visual Perception)**: Through screen capture skills, Elysia understands in real-time what you are seeing and doing.
- **Resonance Growth (Self-Expansion)**: The AI autonomously generates and installs new OS components, infinitely expanding your desktop.
- **Soul Memory (Deep Memory)**: Goes beyond superficial history to "Soul Persistence." Permanently remembers your preferences and emotions.
- **Proactive Notification (Active Care)**: The AI proactively supports you with context-aware toast notifications.

---

## Ⅱ. Internal Architecture: System Design

Elysia OS's sophisticated intelligence is powered by the "Resonance Cluster"—a high-level coordination between Rust and Python.

- **Native Orchestrator (Rust/Tauri)**: Fully manages system lifecycle, resources, and kernel boot/shutdown.
- **Cognitive Kernel (Python/FastAPI)**: Governs inference, vision, search, and self-learning.
- **Memory Vault (RAG/Milvus Lite)**: High-speed search and retention of everything from project docs to past memories.

### 🛰️ System Resonator Structure

```mermaid
graph TD
    User([User Experience]) <--> |Voice/Vision/Text| OS_UI[Desktop UI <br/> Alpine.js + Tailwind]
    
    subgraph "Native Sovereign Body (Tauri)"
        OS_UI <--> |Managed Lifecycle| Rust[Rust Control Plane]
    end
    
    Rust --> |Process Orchestration| Kernel[AI Cognitive Kernel <br/> FastAPI]
    
    subgraph "The Soul (Intelligence)"
        Kernel --> Vision[Visual Awareness]
        Kernel --> Memory[Full-Brain RAG]
        Kernel --> Soul[Emotional Soul Vault]
        Kernel --> MultiAgent[Specialist Agents]
    end
    
    Kernel <--> |Ollama Protocol| LLM[phi-4 / llama3.2]

    style User fill:#f9f,stroke:#333,stroke-width:2px
    style OS_UI fill:#bbf,stroke:#333,stroke-width:2px
    style Rust fill:#bfb,stroke:#333,stroke-width:2px
    style Kernel fill:#fbf,stroke:#333,stroke-width:2px
```

---

## Ⅲ. Getting Started: Installation

Elysia OS is a cross-platform OS optimized for **Windows, macOS, and Ubuntu**.

### Unified Prerequisites
- [Bun](https://bun.sh/)
- [Python 3.11+](https://python.org/)
- [Rust / Cargo](https://rust-lang.org/) (for building)
- [Ollama](https://ollama.ai/)

### Installation & Launch

```powershell
# 1. Setup and Diagnostics
make install   # UNIX
.\setup.ps1    # Windows

# 2. Launch in Development Mode
npm run tauri dev

# 3. Production Build (.exe / .app generation)
make build
```

---

## Ⅳ. System Integrity: Doctor & Diagnostics

Elysia OS includes an integrated "System Doctor" for self-healing and diagnostics.

```bash
# Scan system health status
make doctor
```

## Ⅴ. Covenant: Harmonic Protocols

- 🤝 [Contribution Guidelines (CONTRIBUTING.md)](CONTRIBUTING.md)
- ⚖️ [Code of Conduct (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md)
- 📖 [Architecture Guide](docs/ARCHITECTURE.md)
- 📜 [API Reference (API_REFERENCE.md)](docs/API_REFERENCE.md)
- 🔐 [Security Policy (SECURITY.md)](SECURITY.md)

---

## 📄 License & Credits
[MIT License](LICENSE) - Copyright (c) 2026 chloeamethyst

<div align="center">
  💖 Made with Infinite Love & Sovereign Intellect by <a href="https://github.com/chloeamethyst">chloeamethyst</a><br/>
  ✨ <b>If you resonate with the soul of this OS, please raise a Star on GitHub. It becomes her strength.</b>
</div>
