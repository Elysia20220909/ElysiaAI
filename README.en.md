# Elysia AI (RAG + Ollama + Milvus)

AI chat powered by Elysia (Bun). Integrates RAG via FastAPI + Milvus Lite and Ollama (LLM). Also bundles `network_simulation/` (separate license).

## Features
- RAG: FastAPI + Milvus Lite (`all-MiniLM-L6-v2`)
- LLM: Ollama (`llama3.2`) with streaming responses
- Web: Elysia + Alpine.js UI (`/elysia-love` endpoint)
- Mobile: React Native + Expo (iOS/Android app)
- Extra: `network_simulation/` (AbyssGrid: Blackwall Simulation)

## Quick Start
```powershell
# 1) Install Node/JS deps
bun install

# 2) Set up Python environment
./scripts/setup-python.ps1

# 3) Start servers (in separate terminals)
./scripts/start-fastapi.ps1      # RAG / 127.0.0.1:8000
./scripts/start-network-sim.ps1  # NetworkSim API / 127.0.0.1:8001

# 4) Start Elysia
bun run src/index.ts             # http://localhost:3000
```

On Linux/macOS/WSL, use the `.sh` scripts instead.

## Mobile App (iOS/Android)

### Setup
```bash
./scripts/setup-mobile.ps1  # Windows
# or
./scripts/setup-mobile.sh   # Linux/macOS
```

### Run
1. Start the Elysia server (see Quick Start above)
2. Find your computer's local IP:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. Launch mobile app:
   ```bash
   cd mobile
   npm start  # or: bun start
   ```
4. Scan QR code with [Expo Go](https://expo.dev/client) app
5. In the app, tap ⚙️ and set server URL to `http://YOUR_IP:3000`

See `mobile/README.md` for details.

## Build & Distribution
```powershell
bun run build
bun run pack:zip
```
Attach the generated `dist.zip` to a release.

## Helper Scripts (Windows)
- `./scripts/start-server.ps1`: Start Elysia server (configurable `PORT`)
- `./scripts/test-ai.ps1`: Test `POST /ai` endpoint
- `./scripts/test-elysia-love.ps1`: Test streaming `POST /elysia-love`
- `./scripts/test-rag.ps1`: Test FastAPI `POST /rag`
- `./scripts/dev.ps1`: Unified runner for FastAPI → Elysia (+optional NetworkSim); press Enter to stop all

## Helper Scripts (Linux/macOS/WSL)
- `./scripts/start-server.sh`: Start Elysia server
- `./scripts/start-fastapi.sh`: Start FastAPI RAG server
- `./scripts/start-network-sim.sh`: Start Network Simulation API
- `./scripts/dev.sh`: Unified runner for FastAPI → Elysia (+optional NetworkSim); Ctrl+C to stop

```bash
# Example: start with defaults
./scripts/dev.sh

# Example: also start Network Simulation API
./scripts/dev.sh --network-sim
```

## Publish to npm (optional)
Not required for app usage, but if you publish:

1) Check `package.json`
- `name`: Unique package name (consider a scope, e.g., `@your-scope/elysia-ai`)
- `version`: Semantic versioning
- `license`: `MIT`
- `main`: `dist/index.js`
- `files`: `dist`, `README.md`, `LICENSE`
- `prepublishOnly`: `bun run build`

2) Login and publish
```powershell
npm login
npm version patch
npm publish --access public
```

3) Notes
- This package ships a server app (no public library API).
- Mind licenses of dependencies and models.

## License
- Root code is MIT-licensed (`LICENSE`).
- `network_simulation/` follows its original license (see its `LICENSE`).
- Dependencies/models follow their providers' licenses. See `THIRD_PARTY_NOTICES.md`.

## Metadata
- Homepage: https://github.com/chloeamethyst/ElysiaJS
- Contact: Issues or Discussions
