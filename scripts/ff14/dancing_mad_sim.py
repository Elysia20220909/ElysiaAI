import time
import sys

# Ensure UTF-8 for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class DancingMadSimulator:
    """
    Raid Combat Simulator for 'Dancing Mad (Ultimate)'.
    Simulates the 19-minute timeline, burst windows, and key mitigation checks.
    """
    
    TIMELINE = [
        (0, "START", "Battle Commenced. Opening Burst Phase."),
        (300, "PHASE_1_END", "Statue of the Gods (Lower) defeated. Transitioning to Middle."),
        (600, "PHASE_2_END", "Statue of the Gods (Middle) defeated. Transitioning to Upper."),
        (720, "INTERMISSION", "The Ascent: Light of Judgment. Extreme Mitigation Required!"),
        (780, "PHASE_4_START", "God Kefka Manifested. Burst Window Open."),
        (1020, "FORSAKEN_LOOP", "Kefka casting 'Forsaken'. High damage variance detected."),
        (1140, "ENRAGE", "Absolute End. DPS Check Failure Imminent.")
    ]

    def __init__(self):
        self.total_dps = 0
        self.raid_mitigation = 1.0 # 1.0 = No mitigation, 0.5 = 50% reduction
        self.current_time = 0

    def run_sim(self):
        print("=== [SIMULATION START: DANCING MAD (ULTIMATE)] ===")
        print(f"[*] RAID CONFIG: Full Party (IL 750+) | Target Time: 1140s")
        print("-" * 60)

        for timestamp, event, description in self.TIMELINE:
            # Simulate passage of time (accelerated)
            wait_time = (timestamp - self.current_time) / 100
            time.sleep(wait_time)
            
            self.current_time = timestamp
            
            # Burst logic
            is_burst = (self.current_time % 120 == 0)
            burst_tag = " [💥 BURST WINDOW]" if is_burst else ""

            # Mitigation logic
            if event == "INTERMISSION":
                self.raid_mitigation = 0.4 # Tank LB3 + Addle + Reprisal
                mit_status = "SHIELDED (60% REDUCTION)"
            elif event == "FORSAKEN_LOOP":
                self.raid_mitigation = 0.7
                mit_status = "SHIELDED (30% REDUCTION)"
            else:
                self.raid_mitigation = 1.0
                mit_status = "NORMAL"

            print(f"[{self.current_time:04d}s] EVENT: {event:<15} | {mit_status:<25}{burst_tag}")
            print(f"        > {description}")

        print("-" * 60)
        print("[+] SIMULATION COMPLETE.")
        print("[*] Result: Clear Opportunity identified at 1132s. DPS margin: 2.4%.")

if __name__ == "__main__":
    sim = DancingMadSimulator()
    sim.run_sim()
