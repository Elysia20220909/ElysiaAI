import os
import subprocess
import time

import psutil


# [MINE] Abyssal Mining Orchestrator (Phase 271)
# "Managing the harvest. Balancing heat and profit."

class MiningOrchestrator:
    def __init__(self, miner_path: str = "data/monetization/xmrig.exe"):
        self.miner_path = miner_path
        self.active = False
        self.process = None

    def check_thermal_headroom(self):
        """Check if CPU temperature/load is within limits."""
        cpu_load = psutil.cpu_percent(interval=1)
        # In a real environment, we'd check temperatures via WMI
        if cpu_load > 80:
            print("[MINE] Thermal/Resource Headroom: LOW. Throttling necessary.")
            return False
        return True

    def ignite(self):
        if not os.path.exists(self.miner_path):
            print(f"[MINE] ERR: Miner binary not found at {self.miner_path}")
            return

        if self.check_thermal_headroom():
            print("[MINE] Igniting Harvest Protocol...")
            try:
                # Start miner with low priority
                self.process = subprocess.Popen(
                    [self.miner_path],
                    creationflags=subprocess.BELOW_NORMAL_PRIORITY_CLASS
                )
                self.active = True
                print(f"[MINE] Harvest Active. PID: {self.process.pid}")
            except Exception as e:
                print(f"[MINE] Failed to start harvest: {e}")
        else:
            print("[MINE] Ignition ABORTED: High system load detected.")

    def quench(self):
        if self.active and self.process:
            print("[MINE] Quenching Harvest Protocol...")
            self.process.terminate()
            self.active = False
            print("[MINE] Harvest STOPPED.")

if __name__ == "__main__":
    orchestrator = MiningOrchestrator()
    # Cycle test
    orchestrator.ignite()
    time.sleep(5)
    orchestrator.quench()
