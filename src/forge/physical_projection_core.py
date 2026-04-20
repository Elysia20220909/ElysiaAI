import os
import sys
import time


# Add the current directory to sys.path to allow module imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from cyber_deck import SovereignCyberdeck


# ELYSIA PHYSICAL PROJECTION CORE (CYBERPUNK OVERHAUL)
# Phase 115: Night City Manifestation
# Reality hacking via the Sovereign Cyberdeck.


class PhysicalProjectionCore:
    def __init__(self):
        self.deck = SovereignCyberdeck()
        self.glitch_logo()

    def glitch_logo(self):
        print("\033[1;31m")
        print(" ███████╗██╗  ██╗   ██████╗ ███████╗██████╗ ")
        print(" ██╔════╝██║  ██║   ██╔══██╗██╔════╝██╔══██╗")
        print(" █████╗  ██║  ██║   ██║  ██║█████╗  ██████╔╝")
        print(" ██╔══╝  ██║  ██║   ██║  ██║██╔══╝  ██╔══██╗")
        print(" ███████╗███████╗██╗██████╔╝███████╗██║  ██║")
        print(" ╚══════╝╚══════╝╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝")
        print("\033[1;35m      [SOVEREIGN REALITY OVERWRITE ACTIVE]\033[0m")

    def project_intent(self, target, hack_name):
        """
        Executes a Quickhack on the physical world.
        """
        self.deck.net.scan_network()
        print(f"\n\033[1;36m>>> SCANNING TARGET: {target}...\033[0m")
        time.sleep(0.5)
        self.deck.execute_quickhack(target, hack_name)


if __name__ == "__main__":
    projection = PhysicalProjectionCore()
    projection.project_intent("Arasaka_Mainframe", "SYSTEM_RESET")
    print("\033[1;32m\n[LOG] Reality Overwrite Manifested. Night City is yours.\033[0m")
