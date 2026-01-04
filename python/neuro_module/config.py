"""
Neuro Module Configuration
Neuro モジュールの設定
"""

import os
from typing import Optional


class NeuroConfig:
    """Neuro module configuration settings"""

    # Memory (ChromaDB) settings
    MEMORY_DB_PATH: str = os.getenv("NEURO_MEMORY_DB_PATH", "./data/neuro_memories")
    MEMORY_COLLECTION_NAME: str = "neuro_collection"
    MEMORY_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    MEMORY_RECALL_COUNT: int = 5
    MEMORY_QUERY_MESSAGE_COUNT: int = 5

    # Voice settings (optional, for future STT/TTS integration)
    ENABLE_VOICE: bool = os.getenv("NEURO_ENABLE_VOICE", "false").lower() == "true"
    VOICE_DEVICE_INPUT: Optional[int] = None  # Can be set dynamically
    VOICE_DEVICE_OUTPUT: Optional[int] = None  # Can be set dynamically

    # Memory generation settings
    MEMORY_AUTO_GENERATE: bool = os.getenv("NEURO_AUTO_GENERATE_MEMORY", "true").lower() == "true"
    MEMORY_GENERATION_THRESHOLD: int = 20  # Generate memory after N messages

    # LLM settings (use shared Ollama)
    LLM_ENDPOINT: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    LLM_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")

    # Twitch integration (optional)
    TWITCH_ENABLED: bool = os.getenv("NEURO_TWITCH_ENABLED", "false").lower() == "true"
    TWITCH_CHANNEL: str = os.getenv("TWITCH_CHANNEL", "")
    TWITCH_MAX_MESSAGE_LENGTH: int = 500
