# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enterprise-grade project structure and documentation
- Comprehensive CI/CD workflows
- Monitoring and observability setup
- Community contribution guidelines

## [1.0.51] - 2025-12-03

### Added
- VOICEVOX integration with Shikoku Metan voice
- Emotional expression system (joy/shy/normal) with automatic pitch adjustment
- User name personalization (addresses users by name instead of generic terms)
- Voice log saving (up to 100 entries)
- Complete security features: XSS/SQLi/DoS/Prompt Injection protection
- JWT authentication system with refresh tokens
- Self-learning capabilities via Feedback and Knowledge APIs
- JSONL-based data persistence with rotation scripts
- Redis integration for rate limiting (with in-memory fallback)
- Comprehensive maintenance scripts (weekly/monthly/quarterly)
- Docker support with production-ready Dockerfile
- Cloud deployment scripts (AWS/GCP)
- Multi-platform setup scripts (Windows PowerShell, Linux/macOS bash)

### Changed
- Updated to Elysia v1.4.17
- Migrated from ESLint/Prettier to Biome for better performance
- Enhanced UI with Glassmorphism design
- Improved error handling and validation

### Security
- JWT secret rotation support
- Input sanitization with sanitize-html
- Rate limiting with configurable thresholds
- CORS configuration with whitelist support
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Protection against common vulnerabilities (XSS, SQLi, CSRF)

## [1.0.0] - 2025-XX-XX

### Added
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

[Unreleased]: https://github.com/chloeamethyst/ElysiaJS/compare/v1.0.51...HEAD
[1.0.51]: https://github.com/chloeamethyst/ElysiaJS/releases/tag/v1.0.51
[1.0.0]: https://github.com/chloeamethyst/ElysiaJS/releases/tag/v1.0.0
