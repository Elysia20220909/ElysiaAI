# Test Gating Guide

## Overview

Elysia AI uses environment variables to control test execution in CI/CD and local development environments. This prevents tests that require live services (Redis, FastAPI, Ollama) from failing when those services are unavailable.

## Environment Variables

### `RUN_LIVE_TESTS`
**Purpose**: Controls execution of tests that require live backend services (Redis, FastAPI, Ollama).

**Default**: `undefined` (tests are skipped by default in CI)

**Usage**:
```bash
# Enable live tests locally
export RUN_LIVE_TESTS=true
bun test

# Or inline
RUN_LIVE_TESTS=true bun test
```

**Affected Tests**:

- `tests/api.test.ts` - API endpoint tests
- `tests/chat-comprehensive.test.ts` - Chat functionality tests
- `tests/game.test.ts` - Game API tests
- `tests/integration/api.test.ts` - Integration tests
- `tests/performance/api-performance.test.ts` - Performance benchmarks
- `tests/server.test.ts` - Server integration tests

### `RUN_E2E_TESTS`
**Purpose**: Controls execution of end-to-end tests using Playwright.

**Default**: `undefined` (E2E tests are skipped by default)

**Usage**:
```bash
# Enable E2E tests locally
export RUN_E2E_TESTS=true
bun test

# Or inline
RUN_E2E_TESTS=true bun test
```

**Affected Tests**:

- `tests/e2e/app.spec.ts` - Full application E2E tests with browser automation

## CI/CD Configuration

### GitHub Actions
Both environment variables are set to `false` in CI pipelines to skip live/E2E tests by default:

```yaml
- name: Run unit tests
  run: bun test
  env:
    RUN_LIVE_TESTS: false
    RUN_E2E_TESTS: false
```

### Local Development
For local testing with all services running:

```bash
# Start all services
bun run dev

# In another terminal, run all tests
RUN_LIVE_TESTS=true RUN_E2E_TESTS=true bun test
```

### Test Output
- **Skipped**: Tests show as "skipped" when environment variables are not set
- **Running**: Tests execute normally when variables are set to `true`
- **Failing**: Only unit tests and non-gated tests will fail in CI if broken

## Implementation Pattern

Tests use a conditional describe wrapper:

```typescript
const describeLive = process.env.RUN_LIVE_TESTS === 'true' 
  ? describe 
  : describe.skip;

describeLive("Chat API", () => {
  // Tests that need live services
});
```

For E2E tests:
```typescript
if (process.env.RUN_E2E_TESTS !== 'true') {
  console.log('[Playwright] Skipping E2E tests (RUN_E2E_TESTS not set)');
  process.exit(0);
}

test.describe("Application E2E", () => {
  // Playwright tests
});
```

## Test Results Summary (Current)
- **Unit Tests**: 73 passing
- **Skipped Tests**: 57 (live + E2E tests)
- **Failing Tests**: 0
- **Exit Code**: 0 ✅

## Recommended Workflow

1. **Local Development**:
   - Set `RUN_LIVE_TESTS=true` when services are running
   - Set `RUN_E2E_TESTS=true` only for full UI testing

2. **CI Pipeline**:
   - Keep both variables `false` to run only unit tests
   - Create separate workflow for integration testing with service setup

3. **Pre-commit**:
   - Run unit tests only (default behavior)
   - Fast feedback loop without service dependencies
