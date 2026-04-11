import os
import time
import hashlib
import psutil
import logging
from typing import Optional

logger = logging.getLogger("elysia.entropy")

class EntropyEngine:
    """
    Sovereign Phase 33: Entropy Engine (Singularity Core).
    Collects high-res system jitter to seed dynamic cryptographic keys.
    """
    def __init__(self):
        self._last_entropy = 0.0
        logger.info("🌀 Singularity Core: Entropy Engine online.")

    def collect_chaos(self) -> bytes:
        """
        Gathers system-level entropy from multiple jitter sources.
        """
        # 1. CPU Jitter
        t1 = time.perf_counter_ns()
        cpu = psutil.cpu_percent(interval=None) or 0.1
        t2 = time.perf_counter_ns()
        
        # 2. IO Jitter
        io = psutil.disk_io_counters()
        io_val = (io.read_bytes + io.write_bytes) if io else 0
        
        # 3. Kernel Jitter (Memory)
        mem = psutil.virtual_memory().available
        
        # 4. OS Jitter
        os_noise = os.urandom(16)
        
        # Combine into a chaotic seed
        seed_material = f"{t1}-{t2}-{cpu}-{io_val}-{mem}-{time.time()}"
        chaos_hash = hashlib.sha3_256(seed_material.encode() + os_noise).digest()
        
        self._last_entropy = (t2 - t1) % 1000 / 1000.0
        return chaos_hash

    def generate_quantum_salt(self, length: int = 64) -> bytes:
        """
        Phase 38: Post-Quantum Aegis (PQ3 Simulation).
        Generates extreme-entropy salts using SHA3-512 and high-res jitter.
        """
        material = self.collect_chaos()
        # High-res timestamps for extra jitter
        jitter = str(time.perf_counter_ns()).encode()
        # Use SHA3-512 for future-proof resistance
        pq_salt = hashlib.sha3_512(material + jitter + os.urandom(length)).digest()
        logger.info(f"🌀 PQ3: Produced Quantum Salt ({len(pq_salt)*8} bits).")
        return pq_salt[:length]

    def get_chaos_level(self) -> float:
        """Returns a 0.0-1.0 value representing current system jitter."""
        return self._last_entropy

# Global Instance
entropy = EntropyEngine()
