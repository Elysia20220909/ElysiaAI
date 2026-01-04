from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Audio Gateway", version="0.1.0", description="Scaffold for STT/TTS services")


class STTRequest(BaseModel):
    audio_url: Optional[str] = None
    language: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    language: Optional[str] = None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "audio-gateway"}


@app.post("/stt/stream")
async def stt_stream(payload: STTRequest) -> dict:
    # Placeholder implementation; real STT will be added later.
    if not payload.audio_url:
        raise HTTPException(status_code=400, detail="audio_url is required for STT scaffold")
    return {
        "status": "not_implemented",
        "message": "STT processing will be implemented in a subsequent step",
        "echo": payload.model_dump(),
    }


@app.post("/tts")
async def tts(payload: TTSRequest) -> dict:
    # Placeholder implementation; real TTS will be added later.
    if not payload.text:
        raise HTTPException(status_code=400, detail="text is required for TTS scaffold")
    return {
        "status": "not_implemented",
        "message": "TTS synthesis will be implemented in a subsequent step",
        "echo": payload.model_dump(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("audio_gateway.app:app", host="0.0.0.0", port=8100, reload=False)
