import os
import logging

try:
    from faster_whisper import WhisperModel
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False


logger = logging.getLogger("elysia.stt")

class ElysiaSTT:
    """
    Elysia OS - The Ear (Speech-to-Text)
    Uses Faster-Whisper for local, high-speed transcription. 🌸
    """
    def __init__(self, model_size="tiny"):
        self.model_size = model_size
        self.model = None
        
    def _ensure_model(self):
        if not HAS_WHISPER:
            logger.warning("faster-whisper is not installed. STT is disabled.")
            return

        if self.model is None:
            logger.info(f"Loading Whisper model: {self.model_size}...")
            # Use 'cpu' for maximum compatibility, 'cuda' if available
            self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")

    def transcribe(self, audio_path: str) -> str:
        self._ensure_model()
        if self.model is None:
            return "[Error: STT Engine Offline. Please install dependencies.]"
            
        segments, info = self.model.transcribe(audio_path, beam_size=5)
        
        text = ""
        for segment in segments:
            text += segment.text
            
        return text.strip()

# Global instance
_stt_engine = None

def get_stt():
    global _stt_engine
    if _stt_engine is None:
        _stt_engine = ElysiaSTT()
    return _stt_engine
