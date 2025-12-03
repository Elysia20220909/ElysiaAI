# Elysia AI Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Web UI   │  │ Mobile   │  │ Desktop  │  │ API      │       │
│  │ (Alpine) │  │ (React   │  │ (Electron│  │ Clients  │       │
│  │          │  │  Native) │  │         )│  │          │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Elysia)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - CORS Handling                                          │  │
│  │ - Rate Limiting (Redis/In-Memory)                        │  │
│  │ - JWT Authentication                                      │  │
│  │ - Input Validation & Sanitization                        │  │
│  │ - Request Routing                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┬─────────────┐
        ▼                           ▼             ▼
┌──────────────┐          ┌──────────────┐  ┌─────────────┐
│ Chat Service │          │ Auth Service │  │ Data Service│
│              │          │              │  │             │
│ - LLM Query  │          │ - JWT Issue  │  │ - Feedback  │
│ - RAG Search │          │ - Token Ref. │  │ - Knowledge │
│ - Streaming  │          │ - Logout     │  │ - Voice Log │
└──────┬───────┘          └──────────────┘  └──────┬──────┘
       │                                             │
       ▼                                             ▼
┌──────────────────────────────────────┐   ┌──────────────┐
│     AI/ML Backend Services           │   │   Storage    │
│  ┌────────────┐  ┌────────────────┐ │   │              │
│  │  FastAPI   │  │     Ollama     │ │   │ - JSONL      │
│  │  RAG API   │  │  (llama3.2)    │ │   │ - Redis      │
│  │            │  │                │ │   │              │
│  │ - Milvus   │  │ - LLM Gen.     │ │   └──────────────┘
│  │ - Embedding│  │ - Streaming    │ │
│  └────────────┘  └────────────────┘ │
└──────────────────────────────────────┘
```

## Component Details

### 1. Frontend Layer

#### Web UI (Alpine.js + htmx)
- **Purpose**: Interactive web interface
- **Technology**: Alpine.js for reactivity, htmx for server communication
- **Features**:
  - Real-time chat with SSE
  - Voice synthesis (VOICEVOX integration)
  - Glassmorphism UI design
  - Responsive layout

#### Mobile App (React Native)
- **Purpose**: Cross-platform mobile application
- **Technology**: React Native, Expo
- **Status**: In development

#### Desktop App (Electron)
- **Purpose**: Native desktop experience
- **Technology**: Electron
- **Status**: Basic implementation

### 2. API Gateway (Elysia)

#### Core Responsibilities
- **Request Routing**: Direct requests to appropriate services
- **Security**: JWT authentication, input validation, XSS protection
- **Rate Limiting**: Protect against abuse (Redis-backed or in-memory)
- **CORS**: Cross-origin resource sharing
- **Logging**: Request/response logging

#### Key Plugins
- `@elysiajs/cors`: CORS handling
- `@elysiajs/static`: Static file serving
- `@elysiajs/stream`: Server-sent events
- `@elysiajs/swagger`: API documentation

### 3. Services

#### Chat Service
```typescript
┌─────────────────────────────────────┐
│         Chat Service Flow           │
├─────────────────────────────────────┤
│ 1. Receive user message             │
│ 2. Query RAG (FastAPI/Milvus)       │
│ 3. Get relevant context             │
│ 4. Send to LLM (Ollama)             │
│ 5. Stream response via SSE          │
│ 6. Log interaction                  │
└─────────────────────────────────────┘
```

#### Authentication Service
- **Token Management**: JWT access & refresh tokens
- **Session Storage**: Redis (optional)
- **Security**: Bcrypt password hashing, token rotation

#### Data Service
- **Feedback Collection**: User ratings and comments
- **Knowledge Management**: CRUD operations for knowledge base
- **Voice Logs**: Speech synthesis history

### 4. AI/ML Backend

#### FastAPI RAG Service
```python
┌─────────────────────────────────────┐
│     RAG Service Architecture        │
├─────────────────────────────────────┤
│ Input: User query                   │
│   ↓                                 │
│ Embedding Model (all-MiniLM-L6-v2) │
│   ↓                                 │
│ Vector Search (Milvus Lite)        │
│   ↓                                 │
│ Top-K Relevant Documents            │
│   ↓                                 │
│ Context Formatting                  │
│   ↓                                 │
│ Output: Relevant context            │
└─────────────────────────────────────┘
```

**Key Components**:
- **Milvus Lite**: Vector database for semantic search
- **Sentence Transformers**: Text embedding
- **FastAPI**: REST API framework

#### Ollama LLM Service
- **Model**: llama3.2
- **Mode**: Streaming
- **Integration**: Direct HTTP API calls
- **Fallback**: Configurable alternative models

### 5. Storage Layer

#### Redis (Optional)
- **Rate Limiting**: Token bucket algorithm
- **Session Management**: Refresh token storage
- **Caching**: Frequently accessed data

#### JSONL Files
```
data/
├── feedback.jsonl       # User feedback
├── knowledge.jsonl      # Knowledge base entries
└── voice_log.jsonl      # Voice synthesis logs
```

**Rotation Strategy**:
- Size-based rotation (default: 50MB)
- Automated via maintenance scripts
- Numbered backups (e.g., `feedback.jsonl.1`)

### 6. Monitoring Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Monitoring Stack                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │ Application │───▶│  Prometheus  │───▶│ Grafana  │ │
│  │  (Metrics)  │    │  (Scraping)  │    │  (Viz)   │ │
│  └─────────────┘    └──────────────┘    └──────────┘ │
│         │                    │                         │
│         │                    ▼                         │
│         │           ┌──────────────┐                  │
│         │           │ Alertmanager │                  │
│         │           │  (Alerts)    │                  │
│         │           └──────────────┘                  │
│         │                    │                         │
│         └────────────────────┴──────▶ Webhooks       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Chat Request Flow

```
User Input
    │
    ▼
┌─────────────────┐
│ Client (Alpine) │
└────────┬────────┘
         │ POST /elysia-love
         ▼
┌─────────────────┐
│ Elysia Gateway  │
│ - Validate      │
│ - Rate Limit    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Chat Service   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│  RAG   │ │ Ollama │
│FastAPI │ │  LLM   │
└────────┘ └───┬────┘
               │ SSE Stream
               ▼
           ┌────────┐
           │ Client │
           └────────┘
```

### Authentication Flow

```
┌──────┐              ┌─────────┐              ┌───────┐
│Client│              │ Elysia  │              │ Redis │
└───┬──┘              └────┬────┘              └───┬───┘
    │ POST /auth/token     │                       │
    │─────────────────────▶│                       │
    │                      │ Validate credentials  │
    │                      │                       │
    │  Access + Refresh    │ Store refresh token   │
    │◀─────────────────────│──────────────────────▶│
    │                      │                       │
    │ Request + Bearer     │                       │
    │─────────────────────▶│ Verify JWT            │
    │                      │                       │
    │  Response            │                       │
    │◀─────────────────────│                       │
```

## Security Architecture

### Defense in Depth

```
┌────────────────────────────────────────────────────┐
│ Layer 1: Network (Firewall, WAF, Rate Limiting)   │
├────────────────────────────────────────────────────┤
│ Layer 2: Transport (TLS/HTTPS)                    │
├────────────────────────────────────────────────────┤
│ Layer 3: Application (JWT, CORS, CSP)             │
├────────────────────────────────────────────────────┤
│ Layer 4: Input (Validation, Sanitization)         │
├────────────────────────────────────────────────────┤
│ Layer 5: Data (Encryption at rest)                │
└────────────────────────────────────────────────────┘
```

### Security Features

1. **Authentication**: JWT with refresh token rotation
2. **Authorization**: Role-based access control (future)
3. **Input Validation**: Schema-based validation
4. **XSS Protection**: HTML sanitization
5. **CSRF Protection**: Token-based
6. **Rate Limiting**: Per-endpoint limits
7. **Security Headers**: CSP, X-Frame-Options, etc.

## Scalability Considerations

### Horizontal Scaling

```
┌───────────┐
│ Load      │
│ Balancer  │
└─────┬─────┘
      │
  ┌───┴───┬───────┬───────┐
  ▼       ▼       ▼       ▼
┌────┐  ┌────┐  ┌────┐  ┌────┐
│API │  │API │  │API │  │API │
│ 1  │  │ 2  │  │ 3  │  │ N  │
└────┘  └────┘  └────┘  └────┘
  │       │       │       │
  └───┬───┴───┬───┴───┬───┘
      │       │       │
      ▼       ▼       ▼
  ┌──────────────────────┐
  │  Shared Resources    │
  │ - Redis Cluster      │
  │ - Database           │
  └──────────────────────┘
```

### Performance Optimizations

1. **Caching**: Redis for frequently accessed data
2. **Connection Pooling**: Reuse database connections
3. **Streaming**: SSE for real-time responses
4. **Compression**: Gzip for HTTP responses
5. **CDN**: Static assets delivery

## Deployment Architecture

### Development
```
localhost:3000  (Elysia)
localhost:8000  (FastAPI)
localhost:11434 (Ollama)
localhost:6379  (Redis)
```

### Production
```
https://api.domain.com    (Elysia behind Nginx)
https://rag.domain.com    (FastAPI)
Internal: Ollama + Redis + Milvus
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Bun | Fast JavaScript runtime |
| Framework | Elysia | Web framework |
| Frontend | Alpine.js + htmx | Reactive UI |
| AI Backend | FastAPI + Python | RAG service |
| LLM | Ollama (llama3.2) | Language model |
| Vector DB | Milvus Lite | Semantic search |
| Cache | Redis | Rate limiting, sessions |
| Monitoring | Prometheus + Grafana | Observability |
| CI/CD | GitHub Actions | Automation |
