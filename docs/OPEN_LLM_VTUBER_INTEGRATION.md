# Open-LLM-VTuber Bridge

ElysiaAI integrates with Open-LLM-VTuber as an optional companion service. The
recommended shape is loose coupling: run Open-LLM-VTuber beside ElysiaAI and let
ElysiaAI expose discovery/status endpoints for the UI and operators.

## Setup

Clone Open-LLM-VTuber outside the tracked source tree, or into `.tmp/` for local
experiments:

```powershell
gh repo clone Open-LLM-VTuber/Open-LLM-VTuber .tmp\Open-LLM-VTuber -- --depth 1
```

Start Open-LLM-VTuber from its own project directory using its upstream setup
instructions. Its default server is:

```text
http://127.0.0.1:12393
```

Then enable the bridge in ElysiaAI:

```dotenv
OPEN_LLM_VTUBER_ENABLED=true
OPEN_LLM_VTUBER_BASE_URL=http://127.0.0.1:12393
```

## ElysiaAI Endpoints

- `GET /api/vtuber/manifest` returns the configured frontend, WebSocket, ASR,
  TTS, and Live2D model discovery URLs.
- `GET /api/vtuber/status` checks `/live2d-models/info` on the upstream server
  and reports `online`, `offline`, `degraded`, or `disabled`.

## Upstream Contract

The bridge expects the Open-LLM-VTuber v1 server shape:

- Frontend: `/`
- Client WebSocket: `/client-ws`
- TTS WebSocket: `/tts-ws`
- ASR upload endpoint: `/asr`
- Live2D model discovery: `/live2d-models/info`

## License Note

Open-LLM-VTuber code is MIT licensed. Its bundled Live2D sample assets are
covered by separate Live2D terms, so ElysiaAI should not vendor those assets
without an explicit license review.
