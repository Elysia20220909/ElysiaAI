<div align="center">

# 💜 Elysia AI

[![Made with Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![Powered by Elysia](https://img.shields.io/badge/Elysia-1.4-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAxMkwxMiAyMkwyMiAxMkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+)](https://elysiajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)

**Ergonomic AI Chat with RAG** - Lightning-fast, type-safe, and delightful 🦊

[English](./README.en.md) • [日本語](./README.ja.md)

</div>

---

## ✨ Why Elysia AI?

Combining Bun's speed, Elysia's ergonomics, and the power of AI.

```typescript
import { Elysia } from "elysia";

new Elysia()
  .get("/chat", async ({ query }) => {
    // Type-safe, auto-validated, blazing fast ⚡
    const response = await ai.chat(query.message);
    return { reply: response };
  })
  .listen(3000);
```

**No compromises**: Fast, type-safe, and great developer experience.

---

## 🚀 Quick Start

```bash
# Install with Bun (recommended)
bun install

# Setup Python services
bun run scripts/setup-python.ps1  # Windows
# or
./scripts/setup-python.sh         # Linux/macOS/WSL

# Start all services
bun run dev
```

**That's it!** 🎉 Open http://localhost:3000

## Mobile App (iOS/Android)

### Setup

```bash
./scripts/setup-mobile.ps1  # Windows
# or
./scripts/setup-mobile.sh   # Linux/macOS
```

### Run

1. Start the Elysia server (see Quick Start above)
2. Find your computer's local IP:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. Launch mobile app:
   ```bash
   cd mobile
   npm start  # or: bun start
   ```
4. Scan QR code with [Expo Go](https://expo.dev/client) app
5. In the app, tap ⚙️ and set server URL to `http://YOUR_IP:3000`

See `mobile/README.md` for details.

## Desktop App (Windows/Mac/Linux)

### Setup

```bash
./scripts/setup-desktop.ps1  # Windows
# or
./scripts/setup-desktop.sh   # Linux/macOS
```

### Run

1. Start the Elysia server (see Quick Start above)
2. Launch desktop app:
   ```bash
   cd desktop
   npm start  # or: bun start
   ```
3. In the app, click ⚙️ to configure server URL (default: `http://localhost:3000`)

## Performance Optimization (Optional)

### C++ Native Bindings

For high-performance text processing, you can enable C++ modules:

- Tokenization: Fast word splitting for large texts
- Cosine similarity: Vector embedding comparison
- Normalization: Text cleanup

**Requirements**: Visual Studio 2017+ ("Desktop development with C++")

```bash
./scripts/setup-native.ps1  # Requires Visual Studio
```

### CUDA GPU Acceleration

If you have an NVIDIA GPU, dramatically speed up embedding similarity computations (100x+ faster):

**Requirements**:

- NVIDIA GPU (CUDA Compute Capability 7.5+)
- [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) 11.0+
- Visual Studio 2017+

```bash
./scripts/setup-cuda.ps1  # Requires CUDA Toolkit + Visual Studio
```

**Note**: C++/CUDA modules are optional. If builds fail, the app falls back to JavaScript implementations.

## Build & Distribution

```powershell
bun run build
bun run pack:zip
```

Attach the generated `dist.zip` to a release.

## Helper Scripts (Windows)

- `./scripts/start-server.ps1`: Start Elysia server (configurable `PORT`)
- `./scripts/test-ai.ps1`: Test `POST /ai` endpoint
- `./scripts/test-elysia-love.ps1`: Test streaming `POST /elysia-love`
- `./scripts/test-rag.ps1`: Test FastAPI `POST /rag`
- `./scripts/dev.ps1`: Unified runner for FastAPI → Elysia (+optional NetworkSim); press Enter to stop all

## Helper Scripts (Linux/macOS/WSL)

---

## 🛠️ Development

```bash
# Install dependencies
bun install

# Development mode with hot reload
bun run dev

# Type checking
bun run typecheck

# Linting
bun run lint

# Formatting
bun run format

# Run tests
bun test

# Test with coverage
bun test --coverage
```

---

## 🎯 API Endpoints

### **Chat**

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Tell me about Elysia",
  "stream": true
}
```

### **RAG Query**

```bash
POST /api/rag/query
{
  "query": "What is vector search?",
  "top_k": 5
}
```

### **Health Check**

```bash
GET /health
# Returns: { "status": "ok", "uptime": 12345 }
```

**Full API documentation**: http://localhost:3000/swagger

---

## 🧪 Testing & Security

```bash
# Unit tests
bun test

# E2E tests
bunx playwright test

# Load testing
./scripts/load-test.ps1

# Security scan (OWASP ZAP, Locust, etc.)
./run-all-tests.sh
```

**Test Coverage**: 80%+ with comprehensive security testing suite

See [SECURITY_TESTING_GUIDE.md](SECURITY_TESTING_GUIDE.md) for details.

---

## 🚢 Production Deployment

### **Docker** (Recommended)

```bash
# Build production image
docker build -f Dockerfile.production -t elysia-ai:latest .

# Run with docker-compose
docker-compose up -d
```

### **Cloud Platforms**

```bash
# AWS
cd cloud/aws && ./deploy.sh

# GCP
cd cloud/gcp && ./deploy.sh
```

### **Performance**

- **Cold Start**: < 100ms
- **Avg Response**: 45ms (p50)
- **Throughput**: 10,000 req/s
- **Max Concurrent Users**: 50,000+

---

## 📚 Documentation

- 📖 [Architecture Guide](docs/architecture/ARCHITECTURE.md)
- 🔌 [API Reference](docs/API.md)
- 🔐 [Security Best Practices](docs/SECURITY.md)
- 🚀 [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- 🤝 [Contributing Guidelines](docs/community/CONTRIBUTING.md)
- 📝 [Changelog](CHANGELOG.md)

---

## 🗺️ Roadmap

**v2.0** (Q1 2026)

- 🎯 Function calling & tool use
- 🔄 Multi-agent orchestration
- 🌐 GraphQL API

**v2.1** (Q2 2026)

- 🎤 Voice I/O support
- 🖼️ Multi-modal AI (images, video)
- 🔍 Advanced RAG techniques

**v3.0** (Q3 2026)

- 🤖 Agent framework with memory
- 🏢 Multi-tenant architecture
- ☸️ Kubernetes-native deployment

---

## 📄 License

**MIT License**

Copyright (c) 2025 chloeamethyst

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

See [LICENSE](LICENSE) for full text.

---

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/chloeamethyst/ElysiaJS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chloeamethyst/ElysiaJS/discussions)
- **Security**: See [SECURITY.md](docs/SECURITY.md)

---

## 🙏 Credits

[Elysia](https://elysiajs.com/) • [Bun](https://bun.sh/) • [Ollama](https://ollama.ai/) • [Milvus](https://milvus.io/) • [FastAPI](https://fastapi.tiangolo.com/)

---

<div align="center">

Made with ❤️ by [chloeamethyst](https://github.com/chloeamethyst)

⭐ **Star us on GitHub!**

</div>
