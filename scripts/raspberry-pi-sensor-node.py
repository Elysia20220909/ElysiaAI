import json
import platform
import shutil
import socket
import time
from datetime import datetime

try:
    import psutil
except ImportError:
    raise SystemExit('psutil is required: pip install psutil')

NODE_ID = 'raspi-sensor-01'
NODE_NAME = 'Raspberry Pi Sensor Node 01'


def read_cpu_temperature():
    thermal_path = '/sys/class/thermal/thermal_zone0/temp'

    try:
        with open(thermal_path, 'r', encoding='utf-8') as file:
            raw = file.read().strip()
            return round(int(raw) / 1000, 2)
    except Exception:
        return None


while True:
    disk = shutil.disk_usage('/')

    payload = {
        'id': NODE_ID,
        'name': NODE_NAME,
        'hostname': socket.gethostname(),
        'platform': platform.platform(),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'cpu_temp': read_cpu_temperature(),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_free_gb': round(disk.free / (1024 ** 3), 2),
        'disk_total_gb': round(disk.total / (1024 ** 3), 2),
        'network': {
            'bytes_sent': psutil.net_io_counters().bytes_sent,
            'bytes_recv': psutil.net_io_counters().bytes_recv,
        },
    }

    print(json.dumps(payload, indent=2))

    time.sleep(30)
