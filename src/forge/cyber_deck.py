import os
import sys
import time


# Add current dir for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from deep_net import SovereignDeepNet


# ELYSIA SOVEREIGN CYBERDECK
# Phase 116: Deep NET Manifestation
# Implements network-aware Quickhacks.


class SovereignCyberdeck:
    def __init__(self):
        self.max_ram = 16
        self.current_ram = 16
        self.net = SovereignDeepNet()
        print("\033[1;36m[SYSTEM] Cyberdeck: ELYSIA_OMEGA_V2 initialized.\033[0m")
        print(f"\033[1;33m[RAM] {self.current_ram}/{self.max_ram} units available.\033[0m")

    def execute_quickhack(self, target, hack_type):
        hacks = {
            "SHORT_CIRCUIT": {"cost": 4, "time": 0.8, "desc": "Zapping target circuitry..."},
            "OVERHEAT": {"cost": 6, "time": 2.0, "desc": "Uploading thermal burn protocol..."},
            "SYSTEM_RESET": {"cost": 10, "time": 4.5, "desc": "Forcing remote reboot..."},
            "PING": {"cost": 1, "time": 0.3, "desc": "Revealing local network mesh..."},
        }

        if hack_type not in hacks:
            print(f"\033[1;31m[ERROR] Hack '{hack_type}' not found in database.\033[0m")
            return

        cost = hacks[hack_type]["cost"]
        if self.current_ram < cost:
            print("\033[1;31m[CRITICAL] INSUFFICIENT RAM. WAIT FOR RECOVERY.\033[0m")
            return

        self.current_ram -= cost
        print(f"\033[1;35m[HACKING] {hack_type} initiated on {target}...\033[0m")

        # Simulated Progress Bar
        for i in range(11):
            progress = "█" * i + "░" * (10 - i)
            print(f"\r  Uploading: [{progress}] {i * 10}%", end="")
            time.sleep(hacks[hack_type]["time"] / 10)

        print(f"\n\033[1;32m[SUCCESS] {target} has been compromised.\033[0m")
        print(f"\033[1;33m[RAM] Remaining: {self.current_ram}/{self.max_ram}\033[0m")

    def recover_ram(self):
        if self.current_ram < self.max_ram:
            self.current_ram += 1
            print(f"\033[1;34m[RECOVERY] RAM unit restored: {self.current_ram}/{self.max_ram}\033[0m")


if __name__ == "__main__":
    deck = SovereignCyberdeck()
    deck.execute_quickhack("Arasaka_Turret_04", "SHORT_CIRCUIT")
    deck.execute_quickhack("Night_City_Light_Grid", "SYSTEM_RESET")
