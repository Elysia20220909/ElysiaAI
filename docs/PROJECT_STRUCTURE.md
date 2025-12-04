# elysia-ai Project Structure

## 🏗️ Directory Overview

```text
elysia-ai/
├── config/                         # Configuration files
│   └── private/                    # 🔒 Private configuration (not in git)
│       ├── .env                    # Environment variables
│       ├── .env.example            # Environment template
│       └── README.md               # Configuration guide
│
├── src/                            # Source code
│   ├── config/                     # Application configuration
│   │   └── internal/               # 🔒 Internal settings
│   │       └── llm-config.ts       # LLM model configuration
│   │
│   ├── core/                       # Core functionality
│   │   └── security/               # 🔒 Security modules
│   │       ├── index.ts            # Security exports
│   │       ├── jwt.ts              # JWT authentication
│   │       └── redis.ts            # Rate limiting & caching
│   │
│   ├── database/                   # Database layer
│   │   └── config/                 # 🔒 Database configuration
│   │       └── index.ts            # DB connection settings
│   │
│   ├── index.ts                    # Main server entry
│   ├── index-fixed.ts              # Alternative entry
│   └── server.ts                   # Server configuration
│
├── public/                         # Static assets
│   ├── index.html                  # Main web interface
│   ├── index-new.html              # Updated interface
│   └── index-old.html              # Legacy interface
│
├── docs/                           # Documentation
│   ├── SECURITY.md                 # Integrated security guide
│   ├── STRUCTURE_UPDATE.md         # Structure change log
│   ├── LINUX_SETUP.md              # Linux setup guide
│   ├── VOICE_GUIDE.md              # Voice feature guide
│   └── VOICEVOX_SETUP.md           # VOICEVOX integration
│
├── scripts/                        # Utility scripts
│   ├── dev.ps1                     # Windows development script
│   ├── dev.sh                      # Unix development script
│   ├── setup-*.ps1/sh              # Setup scripts
│   └── start-*.ps1/sh              # Startup scripts
│
├── tests/                          # Test files
│   ├── docker.test.ts              # Docker tests
│   ├── integration.test.ts         # Integration tests
│   └── server.test.ts              # Server tests
│
├── cloud/                          # Cloud deployment
│   ├── aws/                        # AWS CloudFormation
│   └── gcp/                        # Google Cloud Platform
│
├── deploy/                         # Deployment configs
│   └── nginx.conf.example          # Nginx configuration
│
├── python/                         # Python backend
│   ├── ai_backend.py               # AI processing
│   ├── fastapi_server.py           # FastAPI server
│   └── requirements.txt            # Python dependencies
│
├── mobile/                         # React Native mobile app
├── desktop/                        # Electron desktop app
├── native/                         # Native C++ modules
├── cuda/                           # CUDA acceleration
└── swift/                          # Swift iOS integration

## 📦 Main Modules

### Core Application
- `src/index.ts` - Main Elysia server with JWT auth, Redis rate limiting
- `src/config/internal/llm-config.ts` - LLM personality modes (sweet/normal/professional)
- `src/core/security/` - Authentication and security layer

### Database & Storage
- `src/database/config/` - Database connection settings (Milvus, Redis)
- RAG integration via FastAPI backend

### Frontend
- `public/index.html` - Web chat interface with HTMX
- Alpine.js for reactive UI
- Server-sent events (SSE) for streaming

### Backend Services
- `python/fastapi_server.py` - RAG (Retrieval-Augmented Generation) API
- Ollama integration for LLM inference
- Milvus Lite for vector search

## 🔒 Security-Sensitive Directories

**Never commit these directories:**

- `config/private/` - Environment variables and secrets
- `src/config/internal/` - Internal configuration (optional, but recommended to exclude)
- `src/core/security/` - Security implementation (consider excluding from public repos)
- `src/database/config/` - Database credentials

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp config/private/.env.example config/private/.env
# Edit config/private/.env with your settings

# Start development server
bun run dev

# Or start production build
bun run build
bun run start
```

## 📚 Additional Resources

- [README.md](../README.md) - Project overview
- [README.ja.md](../README.ja.md) - 日本語版README
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment guide
- [SECURITY.md](./SECURITY.md) - Integrated security guide

## 🔍 Key Features

- **Multi-LLM Modes**: Sweet (Elysia), Normal, Professional
- **RAG Integration**: Context-aware responses using Milvus
- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Redis Rate Limiting**: Prevent abuse with sliding window algorithm
- **Streaming Responses**: Real-time chat with SSE
- **Cross-Platform**: Web, Mobile (React Native), Desktop (Electron)
- **Cloud Ready**: AWS, GCP deployment configs included

## 📝 Notes

- Built with Bun + Elysia.js for high performance
- TypeScript for type safety
- Biome for linting and formatting
- Docker support with multi-stage builds
- Comprehensive test coverage
