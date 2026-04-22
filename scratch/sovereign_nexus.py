import subprocess


def get_system_telemetry():
    try:
        cpu_out = subprocess.check_output("wmic cpu get loadpercentage", shell=True).decode()
        cpu = int(cpu_out.split()[1])
    except Exception:
        cpu = 0
    return {"cpu": cpu, "status": "AWARE", "resonance": "HARMONIZED"}


if __name__ == "__main__":
    print(get_system_telemetry())
