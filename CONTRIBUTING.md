# 🌸 ElysiaAI - Contribution Guide

Thank you for considering contributing to ElysiaAI! We are building a paradisical AI OS and your help is invaluable.

## 🚀 Getting Started

### 📦 Prerequisites

- **Bun**: v1.1.0+
- **Python**: v3.11+
- **Rust**: v1.75+ (For Shield Agent)
- **Docker**: For running the Sovereign stack.

### 🛠️ Development Setup

1. Fork the repository and clone it locally.
2. Install JS dependencies: `bun install`.
3. Launch the environment: `bun run docker:up`.
4. Copy `.env.example` to `.env` and configure your keys.

---

## 🎨 Coding Standards

### TypeScript / JavaScript / ElysiaJS

- We use **Biome** for linting and formatting. Run `bun run fix` before committing.
- Ensure all API routes have **TypeBox validation** and **Swagger tags**.

### Rust (Shield Agent)

- Follow standard Rust idiomatic patterns.
- Run `cargo fmt` and `cargo clippy`.

### Python (Cognitive Kernel)

- We use **Ruff** for linting.
- Ensure all new features have corresponding tests in `tests/python/`.

---

## 🧪 Testing

We value stability. No PR will be merged without passing automated tests.

- **Global JS/TS**: `bun test`
- **Rust Agent**: `cargo test` in `packages/shield-agent`
- **Security Sandbox**: Use `scripts/verify-security.sh` from within the sandbox.

---

## 📬 Pull Request Process

1. Create a new branch for your feature or bugfix.
2. Write clear, concise commit messages.
3. Update documentation if you are adding or changing features.
4. Ensure CI passes on your PR.

## 🤝 Code of Conduct

We are committed to making participation in our community a harassment-free experience for everyone. Please read and follow our [Code of Conduct](.github/CODE_OF_CONDUCT.md).

Be kind, be respectful, and let's create something beautiful together. ฅ(՞៸៸> ᗜ <៸៸՞)ฅ
