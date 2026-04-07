#!/usr/bin/env python3
"""
Elysia OS - Synthesizer Module (v2.1.0-SOUL)
エリシアちゃんの甘い声を生成する、感性合成モジュール💕
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
    prompt = f"以下の会話からエリシアへの大事なメモを100文字で要約して：\n{history_text}"
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
    """VOICEVOXを使用して音声を生成し、Base64形式で返却する"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. クエリ作成
            resp_query = await client.post(
                f"{VOICEVOX_HOST}/audio_query",
                params={"text": text, "speaker": speaker}
            )
            if resp_query.status_code != 200: return None
            query_data = resp_query.json()

            # 2. 音声合成
            resp_synth = await client.post(
                f"{VOICEVOX_HOST}/synthesis",
                params={"speaker": speaker},
                json=query_data
            )
            if resp_synth.status_code != 200: return None

            # 3. Base64エンコード
            return base64.b64encode(resp_synth.content).decode("utf-8")
    except Exception as e:
        logger.warning(f"⚠️ Voice synthesis failure (is VOICEVOX running?): {e}")
        return None
