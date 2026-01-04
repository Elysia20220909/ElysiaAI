# Audio Gateway (Scaffold)

This is a minimal FastAPI scaffold for the upcoming STT/TTS service. It is intentionally limited to
placeholder endpoints so we can layer real audio pipelines in subsequent commits.

## Endpoints

- `GET /health` — liveness check
- `POST /stt/stream` — placeholder; requires `audio_url`
- `POST /tts` — placeholder; requires `text`

## Run (local)

```bash
python -m audio_gateway.app
# or
uvicorn audio_gateway.app:app --host 0.0.0.0 --port 8100
```

## Notes

- Uses existing FastAPI/uvicorn dependencies already present in the repo.
- No audio processing is performed yet; responses are "not_implemented" echoes.
- Subsequent steps will add concrete STT/TTS backends and wire to Elysia chat routes.
