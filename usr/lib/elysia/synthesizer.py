import asyncio
import base64
import subprocess
import os
import tempfile
import json
import httpx
import logging
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

async def generate_voice(text: str, speaker: int = 2) -> Optional[bytes]:
    """Generate voice using VOICEVOX or SAPI5 fallback, returning raw bytes."""
    
    # Try VOICEVOX first
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp_query = await client.post(
                f"{VOICEVOX_HOST}/audio_query",
                params={"text": text, "speaker": speaker}
            )
            if resp_query.status_code == 200:
                query_data = resp_query.json()
                resp_synth = await client.post(
                    f"{VOICEVOX_HOST}/synthesis",
                    params={"speaker": speaker},
                    json=query_data
                )
                if resp_synth.status_code == 200:
                    return resp_synth.content
    except Exception as e:
        logger.debug(f"VOICEVOX connection failed: {e}. Switching to SAPI5.")

    # Fallback to Windows SAPI5 (Native)
    try:
        return await generate_voice_sapi5(text)
    except Exception as e:
        logger.warning(f"⚠️ All voice synthesis attempts failed: {e}")
        return None

async def generate_voice_sapi5(text: str) -> Optional[bytes]:
    """Uses Windows PowerShell to generate a native TTS .wav file."""
    temp_path = os.path.join(tempfile.gettempdir(), f"elysia_sapi_{os.getpid()}.wav")
    
    # PowerShell command to synthesize to file
    ps_cmd = f"""
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.SetOutputToWaveFile('{temp_path}')
    $synth.Speak('{text}')
    $synth.Dispose()
    """
    
    try:
        # Use asyncio.create_subprocess_exec for async context
        process = await asyncio.create_subprocess_exec(
            "powershell", "-Command", ps_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.communicate()
        
        if os.path.exists(temp_path):
            with open(temp_path, "rb") as f:
                data = f.read()
            os.remove(temp_path)
            return data
    except Exception as e:
        logger.error(f"SAPI5 Synthesis Error: {e}")
    
    return None
