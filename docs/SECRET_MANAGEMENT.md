# 柏 Secret & Key Management Guide

ElysiaAI utilizes high-grade cryptographic standards to protect user sovereignty. This guide outlines the generation, rotation, and operation of secrets.

## 1. Core Security Standard
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: `scryptSync` (Node.js) / `scrypt` (Python)
- **Primary Secret**: `JWT_SECRET` (defined in `.env`)

## 2. Key Derivation Logic (Parity)
Both the TypeScript server and the Python AI kernel derive the 32-byte AES key from the `JWT_SECRET` using matching scrypt parameters:
- **Salt**: Static project salt (defined in code)
- **N**: 16384 (Cost factor)
- **r**: 8 (Block size)
- **p**: 1 (Parallelization)

## 3. Operations & Rotation

### Initial Setup
When setting up a new environment:
1. Run `bun scripts/manage.ts setup`.
2. Edit `.env` and replace `JWT_SECRET` with a strong, random 64-character string.
3. **DO NOT** reuse secrets across dev/prod environments.

### Rotation Policy
- **Secrets should be rotated** if a developer leaves the project or if a compromise is suspected.
- **Warning**: Rotating the `JWT_SECRET` will make all previously encrypted data (Voice logs, Milvus engrams, Action logs) **unreadable** unless you migrate them with the old key.

## 4. Hardware Security (Future)
Phase 3 (Transcendence) will introduce support for **HSM (Hardware Security Modules)** and TPM-backed key storage for AbyssRTOS environments.

---
ﾂｩ 2026 Elysia20220909 // ElysiaAI Security
