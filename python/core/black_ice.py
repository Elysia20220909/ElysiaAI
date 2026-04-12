import logging
import time

from python.core.shadow_gossip import get_mesh_agent


logger = logging.getLogger("elysia.black_ice")
gossip_agent = get_mesh_agent("BlackICE")


class BlackICE:
    """
    Intrusion Countermeasure Electronics - CLASS: BLACK
    Purpose: Aggressive neutralization of unauthorized system interference.
    """

    NEUTRALIZED_TARGETS: dict[str, float] = {}
    FEEDBACK_LOOP_DURATION = 86400 * 30  # 30 days (Simulated permanent ban)

    @classmethod
    def manifest_feedback_loop(cls, ip: str, threat_type: str):
        """
        Initiates a feedback loop on the target IP, effectively de-syncing it from the Sanctuary.
        """
        expiry = time.time() + cls.FEEDBACK_LOOP_DURATION
        cls.NEUTRALIZED_TARGETS[ip] = expiry

        logger.error(f"⚔️ BLACK_ICE ALERT: Feedback loop manifested on target {ip}. Reason: {threat_type}")
        print(f"!!! BLACK_ICE_ACTIVE: Target neutralized: {ip} !!!")

        # Whisper to the shadow mesh
        gossip_agent.whisper(
            {"action": "NEUTRALIZE", "target": ip, "threat": threat_type, "ttl": cls.FEEDBACK_LOOP_DURATION}
        )

    @classmethod
    def is_target_neutralized(cls, ip: str) -> bool:
        """Checks if the target is currently trapped in a feedback loop."""
        if ip in cls.NEUTRALIZED_TARGETS:
            if time.time() < cls.NEUTRALIZED_TARGETS[ip]:
                return True
            del cls.NEUTRALIZED_TARGETS[ip]
        return False

    @classmethod
    def analyze_tamper_pattern(cls, payload: str) -> bool:
        """Advanced pattern analysis for malicious intent."""
        # Check for common netrunning exploit patterns
        malicious_hooks = ["sql_inject", "buffer_overflow", "heap_spray", "ghost_proxy"]
        return any(hook in payload.lower() for hook in malicious_hooks)


class SyntheticDetector:
    """
    Zero-Trust Telemetry (Layer 7)
    Monitors request timing for inhumanly perfect precision.
    """

    REQUEST_HISTORY: dict[str, list[float]] = {}
    MIN_SAMPLES = 5
    JITTER_THRESHOLD = 0.05  # Seconds

    @classmethod
    def track_request(cls, ip: str) -> bool:
        """
        Tracks a request and returns True if synthetic behavior is detected.
        """
        now = time.time()
        if ip not in cls.REQUEST_HISTORY:
            cls.REQUEST_HISTORY[ip] = []

        cls.REQUEST_HISTORY[ip].append(now)
        history = cls.REQUEST_HISTORY[ip]

        if len(history) > cls.MIN_SAMPLES:
            history.pop(0)

        if len(history) == cls.MIN_SAMPLES:
            intervals = [history[i] - history[i - 1] for i in range(1, len(history))]
            avg_interval = sum(intervals) / len(intervals)
            # Calculate variance (jitter)
            variance = sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)

            if variance < (cls.JITTER_THRESHOLD**2):
                logger.warning(
                    f"🤖 SYNTHETIC_AGENT DETECTED: IP {ip} exhibits perfect timing variance ({variance:.6f}s)"
                )
                return True
        return False


def counter_hack_response(ip: str, reason: str):
    """Shorthand for deploying Black ICE response."""
    BlackICE.manifest_feedback_loop(ip, reason)
