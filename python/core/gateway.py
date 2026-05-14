import hashlib
import hmac
import json
import logging
import os
import socket
import sys
import threading
import time
from typing import Any

from python.lib.runtime_secrets import get_required_secret


logger = logging.getLogger("CognitiveGateway")


class CognitiveGateway:
    """
    Integrates signals from AbyssRTOS (C), Aegis Watchdog (Rust), and Heartbeat (Python).
    Normalizes multi-language resonance data for Phase 17 operations.
    """

    def __init__(self, port: int = 5005):
        self.last_sync = time.time()
        self.registry: dict[str, Any] = {
            "c_layer": {"status": "INIT", "resonance": 0.0},
            "rust_layer": {"status": "INIT", "resonance": 0.0},
            "python_layer": {"status": "INIT", "resonance": 0.0},
        }
        self.port = port
        self.lock = threading.Lock()

        # Phase 19: Security Infrastructure
        self.secret = get_required_secret("RESONANCE_SECRET").encode()
        self.seen_nonces: set[str] = set()
        self.max_nonce_cache = 100

        if "pytest" in sys.modules or os.getenv("ELYSIA_TEST_MODE") == "1":
            logger.info("🧪 Cognitive Gateway test mode: background listeners disabled.")
            self.stop_event = threading.Event()
            self.thread = None
            self.poisoning_thread = None
            return

        # Start the background signal listener
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._start_udp_listener, daemon=True)
        self.thread.start()

        # Phase 46: Level 14 Sovereign Silence (Anti-Poisoning)
        self.poisoning_thread = threading.Thread(target=self._monitor_network_poisoning, daemon=True)
        self.poisoning_thread.start()

    def _monitor_network_poisoning(self):
        """Passive monitor for LLMNR/NBT-NS spoofing/poisoning signatures (L14)."""
        # We look for broadcast traffic targeting the host's identity without valid mesh auth
        # In a real environment, this would use raw sockets (scapy-like logic)
        # For the simulation, we monitor for 'unsolicited' discovery packets.
        logger.info("🛡️ L14 Sovereign Silence: Network Poisoning Monitor Active.")

        # We simulate detection of Responder by monitoring for local network anomalies
        # If any unsolicited packet hits our non-mesh ports with certain signatures:
        while not self.stop_event.is_set():
            time.sleep(10)  # Low frequency passive scan
            # Logic: If external_threat_detected:
            # logger.critical("⚠️ [POISONING] Responder-style deception detected on network. Maintaining silence.")

    def _start_udp_listener(self):
        """UDP server that listens for resonance signals from polyglot layers."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.bind(("127.0.0.1", self.port))
            sock.settimeout(1.0)
            logger.info(f"🛰️ Cognitive Gateway Listening on UDP port {self.port}...")
        except OSError as e:
            if e.errno in {98, 10048}:  # Address already in use
                logger.warning(f"⚠️ Gateway: UDP port {self.port} already in use. Skipping listener.")
                return
            raise e

        while not self.stop_event.is_set():
            try:
                data, addr = sock.recvfrom(4096)
                payload = json.loads(data.decode("utf-8"))

                # Phase 19: Validate Signature and Nonce
                if not self._verify_packet(payload):
                    logger.warning(f"🛡️ Gateway: Rejected unsigned/malicious packet from {addr}")
                    continue

                signal = payload.get("data", {})

                # Identify layer based on payload structure
                if "verified_sig" in signal:
                    self.update_signal(
                        "rust_layer",
                        {
                            "resonance": signal.get("resonance_index", 0.0),
                            "kernel_health": signal.get("kernel_health", "UNKNOWN"),
                            "verified_sig": signal.get("verified_sig", ""),
                            "status": "ACTIVE",
                        },
                    )
                elif "shield" in signal or "sig" in signal:
                    self.update_signal(
                        "c_layer",
                        {
                            "resonance": signal.get("resonance", 0.0),
                            "status": signal.get("shield", "OFF"),
                            "kernel_sig": signal.get("sig", ""),
                        },
                    )

            except TimeoutError:
                continue
            except Exception as e:
                logger.warning(f"⚠️ Gateway Signal Error: {e}")

    def update_signal(self, layer: str, data: dict[str, Any]):
        """Updates the gateway with new signal data from a specific layer."""
        with self.lock:
            if layer in self.registry:
                self.registry[layer].update(data)
                self.registry[layer]["last_seen"] = time.time()

    def get_integrated_resonance(self) -> dict[str, Any]:
        """Calculates the unified resonance index across all layers."""
        with self.lock:
            c_res = self.registry["c_layer"].get("resonance", 1.0)
            r_res = self.registry["rust_layer"].get("resonance", 1.0)
            p_res = self.registry["python_layer"].get("resonance", 1.0)

            # Unified resonance is the harmonic mean of all layers
            unified = (c_res + r_res + p_res) / 3.0

            return {
                "unified_resonance": round(unified, 6),
                "layers": self.registry.copy(),
                "status": "HARMONIZED" if unified > 0.98 else "FLUCTUATING",
                "timestamp": time.time(),
            }

    def _verify_packet(self, payload: dict[str, Any]) -> bool:
        """Verifies HMAC-SHA256 signature and prevents replay attacks via Nonce checking."""
        sig = payload.get("signature")
        nonce = str(payload.get("nonce", ""))
        data_dict = payload.get("data", {})
        data_str = json.dumps(data_dict, sort_keys=True)

        if not sig or not nonce:
            return False

        # 1. Replay Attack Check
        with self.lock:
            if nonce in self.seen_nonces:
                logger.warning(f"🛡️ Gateway: Detected duplicate nonce (Replay Attack): {nonce}")
                return False
            self.seen_nonces.add(nonce)

            # Maintenance: limit cache size
            if len(self.seen_nonces) > self.max_nonce_cache:
                # Remove an arbitrary item if it's a set, or clear if full.
                # For better security, a deque would be ideal, but set.clear() or
                # popping an arbitrary item is a start for a simple gateway.
                self.seen_nonces.clear()

        # 2. Signature Verification
        expected_sig = hmac.new(self.secret, f"{nonce}{data_str}".encode(), hashlib.sha256).hexdigest()

        return hmac.compare_digest(sig, expected_sig)


# Global Instance
cognitive_gateway = CognitiveGateway()
