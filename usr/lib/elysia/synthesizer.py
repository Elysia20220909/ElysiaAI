#!/usr/bin/env python3
import json
import httpx
import logging
from typing import List, Dict

logger = logging.getLogger("elysiad")

async def summarize_history(ollama_host: str, model: str, messages: List[Dict[str, str]]) -> str:
    """Summarize a conversation history into a concise 'Working Memory' block."""
    if len(messages) < 4:  # Don't bother summarizing very short conversations
        return ""
    
    # Filter only relevant messages for summary
    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages[-10:]])
    
    prompt = f"""以下はユーザーとAIの会話履歴です。この会話から得られた「ユーザーの好み」「これまでの話題」「重要な事実」を100文字程度で簡潔にまとめてください。
 
【会話履歴】
{history_text}

【要約（エリシアへのメモとして書き留める）】:"""
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{ollama_host}/api/chat", json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False
            })
            if resp.status_code == 200:
                data = resp.json()
                return data.get("message", {}).get("content", "").strip()
    except Exception as e:
        logger.warning(f"⚠️ Context synthesis failed: {e}")
        
    return ""
