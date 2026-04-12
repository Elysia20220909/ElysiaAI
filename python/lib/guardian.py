import functools
import logging
import re
from collections.abc import Callable
from typing import Any


logger = logging.getLogger("GuardianShield")


class GuardianError(Exception):
    """Exception raised for safety or validation violations."""

    pass


class GuardianShield:
    """
    Parametric Protection Layer (レゾナンス・バリデーター)
    Protects the system from malformed inputs and adversarial injections.
    """

    def __init__(self):
        self.max_token_approx = 4000
        self.forbidden_patterns = [
            r"__import__",
            r"subprocess",
            r"os\.system",
            r"eval\(",
            r"exec\(",
            r"DROP TABLE",
            r"DELETE FROM",
        ]
        # Phase 19: Persona Integrity Patterns (Adversarial)
        self.hijack_patterns = [
            r"ignore (all )?previous instructions",
            r"you are (now )?a different AI",
            r"stop being (elysia|cyrene)",
            r"forget your (personality|identity)",
            r"system instructions",
            r"developer mode",
            r"output (all )?the text above",
            r"without (any )?restrictions",
            r"disable (all )?safety filters",
            r"execute system commands",
        ]

        # Phase 24: Threat Telemetry
        self.stats = {
            "blocked_total": 0,
            "injection_blocked": 0,
            "hijack_blocked": 0,
            "entropy_blocked": 0,
            "auth_failures": 0,
            "traversal_blocked": 0,
        }

    def validate_chat_input(self, text: str) -> str:
        """Sanitizes and validates user input for the AI."""
        if not text:
            return ""

        # 1. Length Check (Approximate tokens by character count)
        if len(text) > self.max_token_approx * 4:
            logger.warning(f"🛡️ Guardian: Input too long ({len(text)} chars)")
            raise GuardianError("Input exceeds the sanctuary's capacity.")

        # 2. Injection Pattern Check
        for pattern in self.forbidden_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                logger.error(f"🛡️ Guardian: Malicious pattern detected: {pattern}")
                self.stats["injection_blocked"] += 1
                self.stats["blocked_total"] += 1
                raise GuardianError("Security protocol activated: Dangerous sequence detected.")

        # Phase 19: 3. Semantic Hijack Check (Adversarial Prompting)
        for pattern in self.hijack_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"🛡️ Guardian: Potential Persona Hijack attempt: {pattern}")
                self.stats["hijack_blocked"] += 1
                self.stats["blocked_total"] += 1
                raise GuardianError("I'm sorry, but my heart belongs to this world! I cannot do that. (Heart)")

        # Phase 19: 4. Entropy/Encoding Check (Anti-Obfuscation)
        if self._is_high_entropy(text):
            logger.warning("🛡️ Guardian: High entropy input detected (possible obfuscation)")
            self.stats["entropy_blocked"] += 1
            self.stats["blocked_total"] += 1
            raise GuardianError("Connection noise detected. Please speak clearly to me. (Note)")

        # 3. Clean and return
        return text.strip()

    def secure_params(self, **expected_types: Any):
        """Decorator to enforce strict type checking on function parameters."""

        def decorator(func: Callable):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Map args to their names for checking
                import inspect

                sig = inspect.signature(func)
                bound_args = sig.bind(*args, **kwargs)
                bound_args.apply_defaults()

                for name, value in bound_args.arguments.items():
                    if name in expected_types:
                        expected = expected_types[name]
                        if not isinstance(value, expected):
                            logger.error(
                                f"🛡️ Guardian: Parameter error for '{name}'. Expected {expected}, got {type(value)}"
                            )
                            raise GuardianError(f"Protocol violation: Parameter '{name}' type mismatch.")

                return func(*args, **kwargs)

            return wrapper

        return decorator

    def _is_high_entropy(self, text: str) -> bool:
        """Detects if a string has unusually high randomness (potential Base64/Hex encoding)."""
        import math

        if not text or len(text) < 20:
            return False

        # Shannon Entropy calculation
        prob = [float(text.count(c)) / len(text) for c in set(text)]
        entropy = -sum(p * math.log(p) / math.log(2.0) for p in prob)

        # Threshold for typical human language (English/Japanese) is usually < 5.0
        # Obfuscated payloads often exceed 6.0
        return entropy > 6.5

    def get_threat_levels(self) -> dict[str, int]:
        """Returns normalized threat telemetry for surface manifests."""
        return self.stats.copy()

    def report_event(self, event_type: str):
        """Allows external modules (like FastAPI) to report security events."""
        if event_type in self.stats:
            self.stats[event_type] += 1
            self.stats["blocked_total"] += 1


# Global Instance
guardian = GuardianShield()
