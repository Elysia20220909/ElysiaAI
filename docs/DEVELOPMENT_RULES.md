# ElysiaAI Development Rules

## Summary

This document is the working agreement for ElysiaAI implementation work. It keeps the project local-first, readable, typed, secure, and easy to review.

## Core Principles

- Do not write code from guesses. Read the nearby implementation first.
- State assumptions when a requirement is not explicit.
- Prefer existing Bun, Elysia, FastAPI, Prisma, Tauri, and local utility patterns.
- Keep privacy local-first. Do not add telemetry, remote storage, or cloud calls unless the user asks for them.
- Keep changes narrow. Avoid unrelated refactors, formatting churn, and generated artifacts.
- Write code that can be operated by the next maintainer on a tired day.

## TypeScript And Server Rules

- Keep `strict` TypeScript compatibility.
- Model domain data with explicit exported types when it crosses module boundaries.
- Validate all request bodies at the route boundary.
- Return structured JSON errors with stable codes for API failures.
- Avoid `any` unless an existing framework boundary makes it unavoidable.
- Prefer small pure helpers for validation and normalization.
- Do not leak secrets, tokens, file paths with private data, or raw upstream errors to clients.

## Error Handling

- Handle validation errors as `400`.
- Handle authentication failures as `401`.
- Handle authorization failures as `403`.
- Handle missing resources as `404`.
- Log unexpected server errors with masked context.
- Return user-facing error messages that are useful but not revealing.

## Security And Privacy

- Keep admin and mutation surfaces authenticated.
- Use CSRF protection when cookie authentication is used for unsafe methods.
- Treat `.env`, logs, uploads, caches, deletion output, and runtime state as non-committable local data.
- Keep game or desktop automation manual-launch only.
- Avoid dependencies unless they remove real risk or significant complexity.
- Run dependency and security checks after dependency changes.

## Documentation Rules

- Prefer short sections and bullet lists over long prose.
- Keep Japanese text UTF-8 clean.
- Update task-specific docs only when they help future maintenance.
- Historical notes belong in `docs/archive/` and should not be loaded by default.

## Quality Gates

Use the smallest relevant gate for the change:

- TypeScript/server behavior: `bun test <changed tests>` and targeted Biome check.
- Public text or Japanese-heavy docs: `bun run check:encoding`.
- Dependency edits: `bun run check:deps` and `bun run security:audit`.
- Broad shared behavior: add `bun run typecheck`.

## Review Checklist

- The requirement is implemented without unstated product expansion.
- Inputs are validated before use.
- Errors are explicit and typed.
- Sensitive data stays local and out of logs.
- The change is testable with a small command.
- The final response states assumptions, run commands, and known risks.
