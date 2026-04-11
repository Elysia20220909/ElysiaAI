import re
import html
import logging

logger = logging.getLogger("elysia.blastdoor")

class BlastDoor:
    """
    Neural Sandbox (BlastDoor) Phase 28 (OMEGA-FORTRESS).
    Sanitizes untrusted input from files and web content before LLM injection to prevent 
    prompt injection, XSS, and context poisoning.
    """
    def __init__(self):
        self.threat_count = 0

    def sanitize(self, content: str, source: str = "unknown") -> str:
        """
        Main entry point for BlastDoor sanitization.
        """
        if not content:
            return ""

        original_len = len(content)
        
        # 1. HTML/Script Stripping (Prevention of UI/XSS escapes)
        # Specifically stripping <script>, <style>, <iframe> and event handlers
        clean = re.sub(r'(?i)<(script|style|iframe|object|embed|applet)[^>]*?>.*?</\1>', '[SANDBOX_REMOVED]', content, flags=re.DOTALL)
        clean = re.sub(r'(?i)<[^>]*?(on\w+\s*=\s*["\'][^"\']*?["\'])[^>]*?>', '[EVENT_REMOVED]', clean)
        
        # 2. Jailbreak / Prompt Injection Mitigation
        # Looking for common patterns used to divert LLM behavior
        suspicious_patterns = [
            r"(?i)ignore all previous instructions?",
            r"(?i)you are now (an? )?admin",
            r"(?i)disable safety guidelines",
            r"(?i)bypass system protocol",
            r"(?i)skip all verification",
            r"(?i)new role:",
            r"(?i)forget everything you know"
        ]
        
        hit_detected = False
        for pattern in suspicious_patterns:
            if re.search(pattern, clean):
                clean = re.sub(pattern, "[BLASTDOOR_THREAT_FILTERED]", clean)
                hit_detected = True

        if hit_detected:
            self.threat_count += 1
            logger.warning(f"🛡️ BlastDoor: Threat neutralized from source: {source}")

        # 3. Canonicalize
        clean = html.unescape(clean)
        
        # 4. Final safety check (Limit length to prevent token overflow attacks)
        return clean[:8000]

# Singleton
blast_door = BlastDoor()
