# ElysiaAI: Multi-User & RBAC Design (Proposed)

This document outlines the design for implementing multi-user support and Role-Based Access Control (RBAC) in ElysiaAI.

## 1. User Identity

Users are identified by a unique ID and username.
Authentication is handled via JWT (JSON Web Tokens) with a refresh token rotation strategy.

### User Roles
- **OWNER**: Full system access, hardware management, secret rotation.
- **ADMIN**: User management, log auditing, system configuration.
- **USER**: Standard AI interaction, personal memory access, limited tool usage.
- **GUEST**: Read-only access to public features, no personal memory.

## 2. Resource Authority

Access control is enforced at the API gateway level (ElysiaJS) and verified at the Kernel level (Python).

### Permission Matrix
| Resource | OWNER | ADMIN | USER | GUEST |
| :--- | :---: | :---: | :---: | :---: |
| Chat Interaction | ✅ | ✅ | ✅ | ❌ |
| Personal Memory | ✅ | ✅ | ✅ (Own) | ❌ |
| System Logs | ✅ | ✅ | ❌ | ❌ |
| HW Orchestration | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ |

## 3. Data Sovereignty

Each user has a dedicated partition in the vector database (Milvus) and personal storage.
- **Milvus**: Partitioned by `user_id`.
- **Filesystem**: `data/users/{user_id}/` (Encrypted at rest).

## 4. Implementation Steps

1.  **Phase 1**: Update Database Schema (Prisma) to support multiple users and roles.
2.  **Phase 2**: Implement RBAC Middleware in ElysiaJS.
3.  **Phase 3**: Update Python Kernel to respect `user_id` context in RAG and Tool execution.
4.  **Phase 4**: Add User Profile and Permission UI to the Desktop.

---

© 2026 Elysia20220909 // ElysiaAI Main
