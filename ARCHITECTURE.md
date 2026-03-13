# Architecture Documentation

This document describes the high-level architecture of **Elysia AI**, focusing on the emotional inference and data flow.

## 📸 System Overview

Elysia AI is designed as a multi-modal AI system that integrates Bun (Elysia.js) for high-performance API handling and Python for specialized RAG and sentiment analysis.

```mermaid
graph TD
    User([User Experience]) <--> |WebSocket / REST| Mobile[React Native App]
    Mobile <--> |API Calls| Server[Elysia.js Server]
    
    subgraph "Core Engine (Bun)"
        Server --> Auth[Auth & Security]
        Server --> DB[(SQLite / LibSQL)]
        Server --> Chat[Chat Management]
        Server --> WebSearch[Web Search Service]
    end
    
    subgraph "Inference Layer (Python/Ollama)"
        Chat <--> |HTTP/IPC| AI[FastAPI AI Backend]
        AI <--> |Local Inference| Ollama[Ollama LLM]
        AI <--> |RAG| Knowledge[Knowledge Base]
    end

    style User fill:#f9f,stroke:#333,stroke-width:2px
    style Server fill:#bbf,stroke:#333,stroke-width:2px
    style AI fill:#bfb,stroke:#333,stroke-width:2px
```

## 💓 Sentiment & Context Flow

The soul of Elysia AI lies in how it processes human emotion through lyrical context.

```mermaid
sequenceDiagram
    participant U as User
    participant S as Server (Bun)
    participant A as AI Backend (Python)
    participant K as Knowledge Base

    U->>S: Input (Text/Voice)
    S->>S: Security Scan & Rate Limit
    S->>A: Context + User Message
    A->>K: Search relevant memories
    K-->>A: Retrieved documents
    A->>A: Sentiment Analysis & Tone Tuning
    A-->>S: Generated Lyric Response
    S-->>U: Formatted Output (Markdown)
```

## 🛠 Technology Stack

- **Runtime**: [Bun](https://bun.sh/) (Server), [Node.js](https://nodejs.org/) (Mobile)
- **Framework**: [Elysia.js](https://elysiajs.com/), [FastAPI](https://fastapi.tiangolo.com/), [Expo](https://expo.dev/)
- **Database**: [Prisma](https://www.prisma.io/) with LibSQL
- **AI/LLM**: [Ollama](https://ollama.ai/), [OpenAI API](https://openai.com/) (Optional)
- **Governance**: Biome (Lint/Format), GitHub Actions (CI/CD)
