# 🌸 ElysiaAI - Contribution Guide

Thank you for considering contributing to ElysiaAI! We are building a paradisical AI OS and your help is invaluable.

## 🚀 Getting Started


### 📦 Prerequisites

- **Bun**: v1.1.0+
- **Python**: v3.11+
- **Ollama**: Recommended for local inference.

### 🛠️ Development Setup

1. Fork the repository and clone it locally.
2. Install JS dependencies: `bun install`.
3. Install Python dependencies: `pip install -r requirements.txt`.
4. Copy `.env.example` to `.env` and configure your keys.

---

## 🎨 Coding Standards

### TypeScript / JavaScript

- We use **Biome** for linting and formatting. Run `bun run fix` before committing.

### Python

- We use **Ruff** for linting and **Black** for formatting.
- Follow PEP 8 guidelines.
- Ensure all new features have corresponding tests in `tests/python/`.

---

## 🧪 Testing

We value stability. No PR will be merged without passing automated tests.

- **JS/TS**: `bun test`
- **Python**: `pytest tests/python/`

---

## 📬 Pull Request Process

1. Create a new branch for your feature or bugfix.
2. Write clear, concise commit messages.
3. Update documentation if you are adding or changing features.
4. Ensure CI passes on your PR.
5. Wait for a maintainer to review your changes.

## 🤝 Code of Conduct

We are committed to making participation in our community a harassment-free experience for everyone. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

Be kind, be respectful, and let's create something beautiful together. ฅ(՞៸៸> ᗜ <៸៸՞)ฅ
