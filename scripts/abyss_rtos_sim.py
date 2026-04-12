import json
import random
import socket
import time


def run_rtos_simulation(port=5005):
    """
    Simulates the AbyssRTOS kernel behavior and broadcasts resonance shield telemetry.
    Matches the specification in abyssrtos.c.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = ("127.0.0.1", port)

    system_uptime = 0
    resonance_stability = 1.0

    print(">>> AbyssRTOS v1.4 Simulator - Phase 17 Resonance Active <<<")
    print(f"Target Gateway: 127.0.0.1:{port}")

    try:
        while True:
            system_uptime += 1

            # Simulate Resonance Shield logic from abyssrtos.c
            if system_uptime % 5 == 0:
                resonance_stability = 0.998 + (random.random() * 0.004)

                payload = {
                    "resonance": round(resonance_stability, 6),
                    "shield": "OPTIMAL",
                    "uptime": system_uptime,
                    "phase": 17,
                }

                message = json.dumps(payload).encode("utf-8")
                sock.sendto(message, target)

                if system_uptime % 15 == 0:
                    print(f"[SHIELD] Resonance Lock: 432.0Hz | Stability: {resonance_stability:.4f}")

            time.sleep(1.0)  # Kernel tick
    except KeyboardInterrupt:
        print("\n[INFO] Simulator stopping...")
    finally:
        sock.close()


if __name__ == "__main__":
    run_rtos_simulation()
