# CHANGELOG: ElysiaAI

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.3.0] - 2026-04-27
### Added
- **AES-256-GCM Encryption**: Upgraded from CBC to GCM for the server's `secureVault` and the Python kernel's `SecureEnclave`.
- **Transparent Memory Encryption**: Integrated encryption for Milvus long-term memory content.
- **Log Encryption**: Added encryption for `VoiceLog` and `ActionLog` in the database service.
- **Python Security Parity**: Implemented `usr/lib/elysia/secure_enclave.py` with scrypt key derivation to match the server's security standards.
- **Multi-User Foundation**: Updated Prisma schema with `User`, `ChatSession`, and `RefreshToken` models.
- **Enhanced CI/CD**: Added Python test execution (pytest) to GitHub Actions (`resonance-integrity.yml` and `security-tests.yml`).
- **Management CLI**: Added `test` support for Python and `check` command for project auditing in `manage.ts`.

### Changed
- **README**: Corrected repository URLs and added detailed setup guides for Milvus Lite, VOICEVOX, and Windows environments.
- **Deployment Guide**: Added sections for Tauri, Docker Compose, and Rust binary compilation.

## [0.2.0] - 2026-04-20
### Added
- **Shield Agent**: Initial implementation of the Rust-based threat detection system.
- **Milvus Lite Integration**: Switched to Milvus Lite for local-first long-term memory.
- **VOICEVOX Support**: Added support for high-quality Japanese voice synthesis.

## [0.1.0] - 2026-04-10
### Added
- **Initial Release**: Core ElysiaJS server and FastAPI AI kernel.
- **AbyssRTOS Branding**: Initial architecture and concept release.

---
© 2026 Elysia20220909 // ElysiaAI Main
