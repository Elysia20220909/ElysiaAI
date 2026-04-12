import logging
import os
import socket
import sys
import threading


# Add project root to path
sys.path.append(os.getcwd())

from python.core.black_ice import BlackICE
from python.core.shadow_gossip import get_mesh_agent


# Setup Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AbyssalStressGateway")


class StressGateway:
    """
    L12: Abyssal Stress Test Honeypot.
    Mimics a vulnerable AbyssRPC service to audit L9/L11 defenses against Metasploit.
    """

    def __init__(self, host="0.0.0.0", port=6666):
        self.host = host
        self.port = port
        self.mesh_agent = get_mesh_agent("StressGateway")
        self.is_running = True

    def start(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind((self.host, self.port))
        server.listen(5)
        logger.info(f"🕸️ [HONEYPOT] Abyssal Stress Gateway active on {self.host}:{self.port}")
        logger.info(">>> TARGET ACQUIRED: Waiting for Metasploit interaction...")

        while self.is_running:
            try:
                client, addr = server.accept()
                logger.warning(f"⚠️ [VIGILANT] Unauthorized connection from {addr}")

                # Layer 9: Trigger Quantum Jitter increase upon observation
                self.mesh_agent.whisper(
                    {
                        "type": "INTENT_SYNC",
                        "label": "Singularity Panic",
                        "resonance": 0.4,
                        "event": "PORT_SCAN_DETECTED",
                    }
                )

                client_thread = threading.Thread(target=self.handle_client, args=(client, addr))
                client_thread.start()
            except Exception as e:
                logger.error(f"Gateway Error: {e}")
                break

    def handle_client(self, client, addr):
        try:
            client.send(b"AbyssRPC v0.9 (Pre-Singularity) - Ready.\n")
            data = client.recv(1024)
            if not data:
                return

            decoded = data.decode("utf-8", errors="ignore")
            logger.info(f"Incoming Interrogaton: {decoded[:64]}...")

            # Layer 12: Detect Exploit Patterns
            exploit_patterns = ["metasploit", "exploit", "\x90\x90", "shellcode", "/bin/sh"]
            is_malicious = any(p in decoded.lower() for p in exploit_patterns)

            if is_malicious:
                logger.critical(f"💀 [BREACH_ATTEMPT] Malicious pattern detected from {addr}. Manifesting Black ICE...")
                # Trigger Black ICE Counter-Hack
                BlackICE.manifest_feedback_loop(addr[0], "METASPLOIT_STRESS_TEST")
                client.send(b"ERROR: VOID_RESONANCE_EXCEEDED. CONNECTION DROPPED.\n")
            else:
                client.send(b"ACK: Intent not understood. Connection stable.\n")

        except Exception as e:
            logger.warning(f"Client Handling Error: {e}")
        finally:
            client.close()


if __name__ == "__main__":
    gateway = StressGateway()
    try:
        gateway.start()
    except KeyboardInterrupt:
        logger.info("Gateway shutting down.")
