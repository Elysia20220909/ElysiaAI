# syntax=docker/dockerfile:1.4
# Elysia AI Game Server - Multi-Architecture Dockerfile
# Supports: linux/amd64, linux/arm64

FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY ElysiaAI/game/package.json ElysiaAI/game/bun.lockb* ./
RUN bun install --frozen-lockfile

# Build standalone executable
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY ElysiaAI/game/ ./
RUN bun run build:standalone

# Production image
FROM alpine:latest AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libstdc++ libgcc

# Copy standalone binary
COPY --from=builder /app/dist/elysia-game /app/elysia-game

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S elysia -u 1001 && \
    chown -R elysia:nodejs /app

USER elysia

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["/app/elysia-game"]
