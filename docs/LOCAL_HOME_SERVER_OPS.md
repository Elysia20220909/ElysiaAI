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

The command center now shows service health, manual launch commands, host inventory, home server gates, client surfaces, repair diagnostics, an automatic improvement queue, redacted recent log tails, and a short operator briefing.

## Manual Startup

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-db
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
- Home Server Gates: blueprint, backup, storage, secure access, model, monitoring, network, and lab isolation readiness.
- Live Home Probes: backup evidence, repo volume capacity, Tailscale CLI state, watched management port exposure, Uptime Kuma local HTTP reachability, VLAN plan evidence, and lab isolation checklist state.
- Future Build Path: staged manual-only roadmap from telemetry foundation to ambient home interface.
- Future Tracks: planned Multi-User Support, experimental Advanced CI/CD, experimental AbyssRTOS isolation, and frontier Sovereign Mesh.
- Client Surfaces: Windows, macOS, Linux, Android, and iOS readiness.
- Secure Mesh Matrix: cross-platform route and guardrail readiness for localhost, LAN, and private VPN access.
- Repair Diagnostics: Prisma client readiness and Ollama model visibility.
- Auto Improvement Queue: ranked next steps generated from health, diagnostics, host pressure, and log summaries.
- Recent Local Logs: redacted tails from lite stack and runtime logs.

## Home Server Roadmap

See [E.L.I.S.I.A. Core Home Server Blueprint](./ELYSIA_HOME_SERVER_BLUEPRINT.md) for the implementation-oriented version of the Proxmox, Home Assistant, Ollama/Open WebUI, NAS, monitoring, VPN, and VLAN plan.

The linked local-server plan maps cleanly to a staged ElysiaAI home lab:

- Virtualization mothership: Proxmox VE or an equivalent VM host for separating services.
- Home nervous system: Home Assistant OS for local devices, sensors, and notifications.
- AI workbench: Ollama plus Open WebUI or an OpenAI-compatible local UI.
- Memory and recovery: NAS, ZFS snapshots, VM backups, and restore drills.
- Monitoring room: Uptime Kuma first, then Grafana, Prometheus, and Loki when the stack grows.
- Defense layer: Tailscale for management access, VLAN separation for IoT, guest, server, and lab networks.
- Lab sandbox: isolated security and experiment networks with no path back to daily devices or NAS.

For ElysiaAI, the next useful implementation step is not direct home automation. It is a local readiness surface that can report backup, VPN, disk, model, and network-segmentation state before any integration is allowed to control something.

## Safety Rules

- Manual start only.
- No hidden background scheduler.
- No device or game input automation.
- No automatic companion launch.
- Automatic improvement suggestions are recommendations only; commands are displayed for manual execution.
- Local-first secrets and logs.
- Status endpoints report state; they do not perform remote control.

## Next Build Steps

- Add NAS reachability, snapshot age, GPU inventory, and selected default model evidence.
- Add local-only wake word UI state without automatic microphone activation.
- Add a desktop tray indicator for Elysia Core readiness.
- Add a model switcher that writes configuration only after explicit confirmation.
