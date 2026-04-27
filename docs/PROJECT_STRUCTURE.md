# elysia-ai Project Structure

## 女・・Directory Overview

````text
elysia-ai/
笏懌楳笏� config/                         # Configuration files
笏・  笏披楳笏� private/                    # 白 Private configuration (not in git)
笏・      笏懌楳笏� .env                    # Environment variables
笏・      笏懌楳笏� .env.example            # Environment template
笏・      笏披楳笏� README.md               # Configuration guide
笏・笏懌楳笏� src/                            # Source code
笏・  笏懌楳笏� config/                     # Application configuration
笏・  笏・  笏披楳笏� internal/               # 白 Internal settings
笏・  笏・      笏披楳笏� llm-config.ts       # LLM model configuration
笏・  笏・笏・  笏懌楳笏� core/                       # Core functionality
笏・  笏・  笏披楳笏� security/               # 白 Security modules
笏・  笏・      笏懌楳笏� index.ts            # Security exports
笏・  笏・      笏懌楳笏� jwt.ts              # JWT authentication
笏・  笏・      笏披楳笏� redis.ts            # Rate limiting & caching
笏・  笏・笏・  笏懌楳笏� database/                   # Database layer
笏・  笏・  笏披楳笏� config/                 # 白 Database configuration
笏・  笏・      笏披楳笏� index.ts            # DB connection settings
笏・  笏・笏・  笏懌楳笏� index.ts                    # Main server entry
笏・  笏懌楳笏� index-fixed.ts              # Alternative entry
笏・  笏披楳笏� server.ts                   # Server configuration
笏・笏懌楳笏� public/                         # Static assets
笏・  笏懌楳笏� index.html                  # Main web interface
笏・  笏懌楳笏� index-new.html              # Updated interface
笏・  笏披楳笏� index-old.html              # Legacy interface
笏・笏懌楳笏� docs/                           # Documentation
笏・  笏懌楳笏� SECURITY.md                 # Integrated security guide
笏・  笏懌楳笏� STRUCTURE_UPDATE.md         # Structure change log
笏・  笏懌楳笏� LINUX_SETUP.md              # Linux setup guide
笏・  笏懌楳笏� VOICE_GUIDE.md              # Voice feature guide
笏・  笏披楳笏� VOICEVOX_SETUP.md           # VOICEVOX integration
笏・笏懌楳笏� scripts/                        # Utility scripts
笏・  笏懌楳笏� dev.ps1                     # Windows development script
笏・  笏懌楳笏� dev.sh                      # Unix development script
笏・  笏懌楳笏� setup-*.ps1/sh              # Setup scripts
笏・  笏披楳笏� start-*.ps1/sh              # Startup scripts
笏・笏懌楳笏� tests/                          # Test files
笏・  笏懌楳笏� docker.test.ts              # Docker tests
笏・  笏懌楳笏� integration.test.ts         # Integration tests
笏・  笏披楳笏� server.test.ts              # Server tests
笏・笏懌楳笏� cloud/                          # Cloud deployment
笏・  笏懌楳笏� aws/                        # AWS CloudFormation
笏・  笏披楳笏� gcp/                        # Google Cloud Platform
笏・笏懌楳笏� deploy/                         # Deployment configs
笏・  笏披楳笏� nginx.conf.example          # Nginx configuration
笏・笏懌楳笏� python/                         # Python backend
笏・  笏懌楳笏� ai_backend.py               # AI processing
笏・  笏懌楳笏� fastapi_server.py           # FastAPI server
笏・  笏披楳笏� requirements.txt            # Python dependencies
笏・笏懌楳笏� mobile/                         # React Native mobile app
笏懌楳笏� desktop/                        # Electron desktop app
笏懌楳笏� native/                         # Native C++ modules
笏懌楳笏� cuda/                           # CUDA acceleration
笏披楳笏� swift/                          # Swift iOS integration

## 逃 Main Modules

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

## 白 Security-Sensitive Directories

**Never commit these directories:**

- `config/private/` - Environment variables and secrets
- `src/config/internal/` - Internal configuration (optional, but recommended to exclude)
- `src/core/security/` - Security implementation (consider excluding from public repos)
- `src/database/config/` - Database credentials

## 噫 Quick Start

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

## 答 Additional Resources

- [README.md](../README.md) - Project overview
- [README.ja.md](../README.ja.md) - 譌･譛ｬ隱樒沿README
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment guide
- [SECURITY.md](./SECURITY.md) - Integrated security guide

## 剥 Key Features

- **Multi-LLM Modes**: Sweet (Elysia), Normal, Professional
- **RAG Integration**: Context-aware responses using Milvus
- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Redis Rate Limiting**: Prevent abuse with sliding window algorithm
- **Streaming Responses**: Real-time chat with SSE
- **Cross-Platform**: Web, Mobile (React Native), Desktop (Electron)
- **Cloud Ready**: AWS, GCP deployment configs included

## 統 Notes

- Built with Bun + Elysia.js for high performance
- TypeScript for type safety
- Biome for linting and formatting
- Docker support with multi-stage builds
- Comprehensive test coverage
