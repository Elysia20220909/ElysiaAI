# elysia-ai Project Structure

## 🏗�E�EDirectory Overview

````text
elysia-ai/
├── config/                         # Configuration files
━E  └── private/                    # 🔒 Private configuration (not in git)
━E      ├── .env                    # Environment variables
━E      ├── .env.example            # Environment template
━E      └── README.md               # Configuration guide
━E├── src/                            # Source code
━E  ├── config/                     # Application configuration
━E  ━E  └── internal/               # 🔒 Internal settings
━E  ━E      └── llm-config.ts       # LLM model configuration
━E  ━E━E  ├── core/                       # Core functionality
━E  ━E  └── security/               # 🔒 Security modules
━E  ━E      ├── index.ts            # Security exports
━E  ━E      ├── jwt.ts              # JWT authentication
━E  ━E      └── redis.ts            # Rate limiting & caching
━E  ━E━E  ├── database/                   # Database layer
━E  ━E  └── config/                 # 🔒 Database configuration
━E  ━E      └── index.ts            # DB connection settings
━E  ━E━E  ├── index.ts                    # Main server entry
━E  ├── index-fixed.ts              # Alternative entry
━E  └── server.ts                   # Server configuration
━E├── public/                         # Static assets
━E  ├── index.html                  # Main web interface
━E  ├── index-new.html              # Updated interface
━E  └── index-old.html              # Legacy interface
━E├── docs/                           # Documentation
━E  ├── SECURITY.md                 # Integrated security guide
━E  ├── STRUCTURE_UPDATE.md         # Structure change log
━E  ├── LINUX_SETUP.md              # Linux setup guide
━E  ├── VOICE_GUIDE.md              # Voice feature guide
━E  └── VOICEVOX_SETUP.md           # VOICEVOX integration
━E├── scripts/                        # Utility scripts
━E  ├── dev.ps1                     # Windows development script
━E  ├── dev.sh                      # Unix development script
━E  ├── setup-*.ps1/sh              # Setup scripts
━E  └── start-*.ps1/sh              # Startup scripts
━E├── tests/                          # Test files
━E  ├── docker.test.ts              # Docker tests
━E  ├── integration.test.ts         # Integration tests
━E  └── server.test.ts              # Server tests
━E├── cloud/                          # Cloud deployment
━E  ├── aws/                        # AWS CloudFormation
━E  └── gcp/                        # Google Cloud Platform
━E├── deploy/                         # Deployment configs
━E  └── nginx.conf.example          # Nginx configuration
━E├── python/                         # Python backend
━E  ├── ai_backend.py               # AI processing
━E  ├── fastapi_server.py           # FastAPI server
━E  └── requirements.txt            # Python dependencies
━E├── mobile/                         # React Native mobile app
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
````

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
