# CHANGELOG: ElysiaAI

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.3.0] - 2026-04-27
### 🛡️ Security & Privacy (Resonance Upgrade)
- **Advanced Encryption (AES-256-GCM)**: 
  - Upgraded the core encryption engine from CBC to **GCM (Galois/Counter Mode)** across the entire stack (Node.js & Python).
  - This ensures not only confidentiality but also **Integrity** (detecting any tampering with the encrypted data).
  - Synchronized Key Derivation Function (KDF) using `scrypt` with matching parameters (`N=16384, r=8, p=1`) in both JS and Python environments.
- **Sovereign Memory Encryption**:
  - Implemented transparent encryption for **Milvus Lite** memory content. Every "Engram" stored in the long-term memory is now encrypted at rest.
  - Implemented encryption for **Voice Logs** and **Action Logs** in the database, ensuring that user interactions are never stored as plain text.
- **Black ICE Protocol (Shield Agent)**:
  - Enhanced the Rust-based **Shield Agent** with real-time prompt injection detection.
  - Added semantic validation to block "Jailbreak" patterns (e.g., "ignore previous instructions").
  - Made agent configuration dynamic via environment variables (`SHIELD_LOG_FILE`, `SHIELD_RULES_FILE`).

### 🏗️ Infrastructure & CI/CD
- **Prisma Schema Synchronization**:
  - Overhauled `schema.prisma` to fully support the planned multi-user architecture, adding models for `User`, `ChatSession`, `RefreshToken`, and `KnowledgeBase`.
- **Cross-Environment CI/CD**:
  - Enhanced GitHub Actions (`resonance-integrity.yml` and `security-tests.yml`) to include **Python Pytest** execution alongside Bun tests.
  - Achieved higher security audit standards with the inclusion of `uv` and `safety` checks for Python dependencies.
- **Management CLI (manage.ts)**:
  - Added `test` command support for Python virtual environments.
  - Integrated a `check` command for auditing configuration centralization and script surface bloat.

### 📝 Documentation & UX
- **Architecture Whitepaper**: Updated `ARCHITECTURE.md` with technical deep-dives into **AbyssRTOS** and **ICE layers**.
- **Deployment & Builds**: Added comprehensive guides for **Tauri** desktop builds, **Docker Compose** orchestration, and **Rust** binary compilation.
- **Roadmap**: Established clear milestones for Phase 2 (Resonance) and Phase 3 (Transcendence) in the README.

## [0.2.0] - 2026-04-20
### 🛡️ Security & Intelligence
- **Shield Agent**: Initial implementation of the Rust-based threat detection system for monitoring log anomalies.
- **Milvus Lite Integration**: Transitioned to Milvus Lite to support a "Local-First" sovereign memory architecture without external server dependencies.
- **VOICEVOX Support**: Integrated local Japanese voice synthesis for expressive AI responses.
- **Terminal Effects**: Added multi-colored starfall and meteor animations to the management CLI.
- **YARA Integration**: Pattern Hunter (Phase 220) deployed via Python.
- **Sysmon Alignment**: Hardened Audit Config (Phase 221) generated.

## [0.1.0] - 2026-04-10
### 🚀 Initial Awakening
- **Project Genesis**: Core ElysiaJS server (Backend) and FastAPI AI kernel (Intelligence Hub).
- **AbyssRTOS Concept**: Initial branding and architectural philosophy release.
- **Sovereign Mesh**: Sovereign Mesh Intelligence Network (SMIN) online.
- **AES-256-GCM Integration**: Initial security hardening (NSA/CIA standard).
- **Unicode Hardening**: Forced UTF-8 output across all Abyssal scripts.
- **Win32 API Bridge**: Established "Ghost Bridge" for direct Win32 API interactions.

---
© 2026 Elysia20220909 // ElysiaAI Main
