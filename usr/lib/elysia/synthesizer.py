#!/usr/bin/env python3
"""
Elysia OS - Synthesizer Module (v2.1.0-SOUL)
Emotional synthesis module that generates Elysia's sweet voice 💕

"""
import json
import httpx
import logging
import base64
from typing import List, Dict, Optional

logger = logging.getLogger("elysiad")

VOICEVOX_HOST = "http://127.0.0.1:50021"

async def summarize_history(ollama_host: str, model: str, messages: List[Dict[str, str]]) -> str:
    """Summarize a conversation history into a concise 'Working Memory' block."""
    if len(messages) < 4: return ""
    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages[-10:]])
    prompt = f"Summarize the following conversation into a concise 100-character note for Elysia:\n{history_text}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{ollama_host}/api/chat", json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False
            })
            if resp.status_code == 200:
                return resp.json().get("message", {}).get("content", "").strip()
    except Exception: pass
    return ""

async def generate_voice(text: str, speaker: int = 2) -> Optional[str]:
    """Generate voice using VOICEVOX and return it in Base64 format"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Create query

            resp_query = await client.post(
                f"{VOICEVOX_HOST}/audio_query",
                params={"text": text, "speaker": speaker}
            )
            if resp_query.status_code != 200: return None
            query_data = resp_query.json()

            # 2. Synthesize voice

            resp_synth = await client.post(
                f"{VOICEVOX_HOST}/synthesis",
                params={"speaker": speaker},
                json=query_data
            )
            if resp_synth.status_code != 200: return None

            # 3. Base64 encoding

            return base64.b64encode(resp_synth.content).decode("utf-8")
    except Exception as e:
        logger.warning(f"⚠️ Voice synthesis failure (is VOICEVOX running?): {e}")
        return None
