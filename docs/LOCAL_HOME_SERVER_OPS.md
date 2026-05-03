# Local Home Server Ops

ElysiaAIを、トニー・スタークの家にある司令室のようなローカル運用環境へ育てるための基盤です。

この仕組みはローカル監視と手動起動を前提にしています。デスクトップ、ゲーム、外部機器、音声エンジン、LLMバックエンドを勝手に起動したり操作したりしません。

## Entry Points

| Surface | Path |
| --- | --- |
| Web command center | `http://127.0.0.1:3000/stark-ops.html` |
| JSON status | `http://127.0.0.1:3000/api/local-ops` |
| Health UI | `http://127.0.0.1:3000/health-ui.html` |
| Terminal snapshot | `bun run ops` |
| JSON terminal snapshot | `bun run ops -- --json` |
| Native Lite Lab | `http://127.0.0.1:3000/native-lite.html` |

The command center now shows service health, manual launch commands, host inventory, redacted recent log tails, and a short operator briefing.

## Manual Startup

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
bun scripts/manage.ts dev:lite
bun scripts/manage.ts native-lite
```

Optional companions:

```powershell
bun scripts/manage.ts dev
ollama serve
bun run desktop
```

`dev:lite` starts the command center quickly by skipping heavy Runner Memory boot work. Use `dev` when you want the full RAG memory stack.

VOICEVOX and Open-LLM-VTuber should be started manually from their own applications or repositories.

## System Layers

- Elysia Core: local command bus and web dashboard.
- FastAPI Kernel: AI cognition layer.
- Ollama: local model runtime.
- VOICEVOX: local speech synthesis.
- Open-LLM-VTuber: optional avatar bridge.
- Redis: optional cache and queue layer.
- Tauri Desktop: local cockpit shell.
- Host Inventory: OS, CPU, memory, runtime, PID, uptime, and repo root.
- Recent Local Logs: redacted tails from lite stack and runtime logs.

## Safety Rules

- Manual start only.
- No hidden background scheduler.
- No device or game input automation.
- No automatic companion launch.
- Local-first secrets and logs.
- Status endpoints report state; they do not perform remote control.

## Next Build Steps

- Add disk, GPU, and model inventory cards.
- Add local-only wake word UI state without automatic microphone activation.
- Add a desktop tray indicator for Elysia Core readiness.
- Add a model switcher that writes configuration only after explicit confirmation.
