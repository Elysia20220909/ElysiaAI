# 📜 ElysiaAI: Change Log

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Beta 0.1 release notes and tester guide for the private pilot.
- README Beta 0.1 preview with current Known Issues and release links.

## [1.3.0] - 2026-04-27
### 🛡️ Security & Integrity (Major)
- **Unified Encryption**: Standardized AES-256-GCM and scrypt KDF across Node.js and Python.
- **Milvus Encryption**: Implemented transparent encryption-at-rest for semantic memory chunks.
- **RBAC Enforcement**: Hardened `/admin` routes with mandatory role verification.
- **Threat Model**: Created formal `THREAT_MODEL.md` mapping ICE concepts to STRIDE.

### 🏗️ Architecture & Cleanup
- **License Unification**: Standardized to MIT OR Apache-2.0 dual license.
- **Orchestration**: Replaced legacy scripts with a unified `manage.ts` CLI.
- **Complete Deletion**: Purged all legacy roleplay artifacts, lore files, and non-technical noise to professionalize the repository.
- **Significant Lightweighting**: Removed 10MB+ of non-core sub-packages, mining scripts, and simulation modules to focus on the AI OS core.
- **CI/CD Hardening**: Updated workflows with branch fixes (`master`), SHA pinning, and automated ZAP server startup.

### 📚 Documentation
- **Quick Start**: Created a high-impact, 5-minute onboarding guide.
- **API Spec**: Formally documented core endpoints in `API.md`.
- **Roadmap**: Clarified feature status (Implemented/Experimental/Planned).

## [1.2.0] - 2026-03-15
### Added
- **Multi-layer ICE**: Initial implementation of White ICE and Black ICE.
- **Resonance UI**: Modern, glassmorphism-based dashboard.
- **Milvus Lite**: Integration for local vector storage.

## [1.0.0] - 2026-01-01
### Added
- **Genesis**: Initial release of the sovereign AI OS architecture.
- **Kernel**: FastAPI-based intelligence kernel.
- **Gateway**: Bun-based high-performance gateway.

---
© 2026 Elysia20220909 // ElysiaAI Main
