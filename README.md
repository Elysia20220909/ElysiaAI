# 🚀 Elysia AI - Enterprise-Grade RAG Chat System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh/)
[![Elysia](https://img.shields.io/badge/Elysia-1.4-purple)](https://elysiajs.com/)
[![CI/CD](https://github.com/chloeamethyst/ElysiaJS/workflows/CI%2FCD/badge.svg)](https://github.com/chloeamethyst/ElysiaJS/actions)

**Production-ready AI chat system** with comprehensive RAG, security, monitoring, and multi-platform support.

[English](README.en.md) | [日本語](README.ja.md)

---

## ✨ Core Features

🤖 **AI & RAG**: Multi-personality LLM • Vector search • Ollama integration • Streaming SSE  
🔒 **Security**: JWT auth • Rate limiting • Encryption (AES-256-GCM) • 5-level RBAC  
📊 **Monitoring**: Prometheus metrics • Grafana dashboards • Structured logging • Health checks  
⚡ **Performance**: Redis caching • Async operations • Load balancing ready • 10k req/s  
🧪 **Testing**: 80%+ coverage • Unit/Integration/E2E • Load testing • CI/CD automation  
📦 **Multi-Platform**: Web (Alpine.js) • Mobile (React Native) • Desktop (Electron) • CLI  
🌍 **Deployment**: Docker • AWS • GCP • Kubernetes-ready

---

## 🚀 Quick Start

```bash
# Install
git clone https://github.com/chloeamethyst/ElysiaJS.git && cd ElysiaJS
bun install && pip install -r python/requirements.txt

# Configure
cp .env.example .env  # Edit with your settings

# Start services
redis-server &
python python/fastapi_server.py &
ollama pull llama3.2 &

# Run
bun run dev
```

**Access**: http://localhost:3000 | [Swagger](http://localhost:3000/swagger) | [Health](http://localhost:3000/health)

---

## 🏗️ Architecture

```
Web Client (Alpine.js) 
    ↓ HTTPS
Elysia Server (Bun) ←→ Redis (Cache + Rate Limit)
    ↓
FastAPI (RAG) + Ollama (LLM)
    ↓
Milvus (Vector DB)
```

**Tech Stack**: Bun • Elysia • TypeScript • Redis • Milvus • Ollama • FastAPI • Prometheus • Grafana

---

## 🔐 Security

- **Authentication**: JWT with refresh tokens (15min access + 7day refresh)
- **Rate Limiting**: 60 req/min per user (Redis-backed)
- **Encryption**: AES-256-GCM for sensitive data
- **RBAC**: PUBLIC → AUTHENTICATED → ADMIN → SUPER_ADMIN → SYSTEM
- **Input Validation**: XSS/SQL injection prevention
- **Security Headers**: CSP, X-Frame-Options, HSTS

---

## 📊 Monitoring

```bash
# Start monitoring stack
cd monitoring && docker-compose up -d

# Access Grafana: http://localhost:3001 (admin/admin)
```

**Metrics**: HTTP requests • Response times (p50/p95/p99) • Error rates • Auth attempts • RAG queries

**Alerts**: High error rate • Slow responses • Service down • High memory usage

---

## 🧪 Testing

```bash
bun test                    # All tests
bun test --coverage        # With coverage
bunx playwright test       # E2E tests
.\scripts\load-test.ps1    # Load testing
```

---

## 📈 Performance Benchmarks

| Metric | Value |
|--------|-------|
| Cold Start | < 100ms |
| Avg Response | 45ms (p50) |
| p95 Response | 120ms |
| Throughput | 10,000 req/s |
| Max Users | 50,000+ |
| Memory | 150MB idle, 800MB load |

*AWS t3.xlarge (4vCPU, 16GB)*

---

## 🚢 Deployment

**Docker**:
```bash
docker build -f Dockerfile.production -t elysia-ai .
docker-compose up -d
```

**AWS**: `cd cloud/aws && ./deploy.sh`  
**GCP**: `cd cloud/gcp && ./deploy.sh`

---

## 📖 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design
- [API Reference](docs/API.md) - Complete endpoints
- [Security Guide](docs/SECURITY.md) - Best practices
- [Deployment](DEPLOYMENT.md) - Production setup
- [Contributing](CONTRIBUTING.md) - How to contribute
- [Changelog](CHANGELOG.md) - Version history

---

## 🔄 Roadmap

**v2.0 (Q1 2026)**: Kubernetes • Multi-tenant • GraphQL • Real-time collaboration  
**v2.1 (Q2 2026)**: Voice I/O • Image generation • Advanced RAG  
**v3.0 (Q3 2026)**: Agent framework • Function calling • Multi-modal AI

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
