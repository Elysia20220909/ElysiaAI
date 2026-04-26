import math
import time


# 🌡️ Red Team: Side-Channel Thermal Pulsing (Acoustic/Heat Exfiltration)
# Purpose: Test if the Anti-Acoustic Jitter can effectively mask CPU patterns.

def burn_cpu(duration):
    end_time = time.time() + duration
    while time.time() < end_time:
        [math.sqrt(i) for i in range(1000)]

def transmit_bit(bit):
    if bit == '1':
        print("[RED_TEAM] Bit 1: Pulsing CPU (High Heat)")
        burn_cpu(0.5)
    else:
        print("[RED_TEAM] Bit 0: Resting CPU (Low Heat)")
        time.sleep(0.5)

def simulate_side_channel():
    message = "101101" # Binary for "M" (simplified)
    print(f"[RED_TEAM] Starting Side-Channel Exfiltration: {message}")
    
    for bit in message:
        transmit_bit(bit)
        time.sleep(0.1)

if __name__ == "__main__":
    simulate_side_channel()
    print("✨ [RED_TEAM] Thermal simulation complete.")
