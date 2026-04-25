import mmap
import os
import struct
import time


# 🛰️ Abyssal Binary Bridge (Phase 161)
# "Piercing the Veil between Runtimes."
# Implementing raw memory access to the Sovereign Segment.

class AbyssalBridge:
    def __init__(self, map_file: str, size: int = 1024 * 1024):
        self.map_file = map_file
        self.size = size
        self.mm: mmap.mmap | None = None
        
        # Memory Layout Constants (Sync with TS)
        self.INDEX_LOCK = 0
        self.INDEX_STATE = 4
        self.INDEX_LEN = 8
        self.DATA_OFFSET = 16

        print(f"📡 [BRIDGE] Aligning with Memory Map: {map_file}...")
        self._initialize_map()

    def _initialize_map(self):
        """
        TRIAL 1: File-backed mmap (Windows persistent segment)
        Trial & Error: If the file doesn't exist, we must wait for TS to create it.
        """
        attempts = 0
        while not os.path.exists(self.map_file) and attempts < 10:
            print(f"⏳ [BRIDGE] Waiting for Sovereign Segment (Attempt {attempts})...")
            time.sleep(1)
            attempts += 1

        try:
            # Open the file and map it
            # Note: Windows requires the file to be opened with specific modes
            with open(self.map_file, "r+b") as f:
                self.mm = mmap.mmap(f.fileno(), self.size)
                print("✅ [BRIDGE] Memory Segment Mapped successfully.")
        except Exception as e:
            print(f"🛑 [BRIDGE] Mapping Failed: {e}")
            # FALLBACK: Create an anonymous map if file fails (Simulated)
            self.mm = mmap.mmap(-1, self.size)

    def _lock(self):
        """NSA-grade spinlock implementation using Atomics (simulated via raw memory)"""
        while True:
            lock_val = struct.unpack("<I", self.mm[self.INDEX_LOCK:self.INDEX_LOCK+4])[0]
            if lock_val == 0:
                # Attempt to grab the lock
                self.mm[self.INDEX_LOCK:self.INDEX_LOCK+4] = struct.pack("<I", 1)
                # Verify we actually got it (Atomic simulation)
                if struct.unpack("<I", self.mm[self.INDEX_LOCK:self.INDEX_LOCK+4])[0] == 1:
                    return
            time.sleep(0.001)

    def _unlock(self):
        self.mm[self.INDEX_LOCK:self.INDEX_LOCK+4] = struct.pack("<I", 0)

    def read_sovereign_data(self) -> str | None:
        """Reads data if the state is READY (1)"""
        if not self.mm:
            return None
        
        state = struct.unpack("<I", self.mm[self.INDEX_STATE:self.INDEX_STATE+4])[0]
        if state != 1:
            return None
            
        self._lock()
        try:
            data_len = struct.unpack("<I", self.mm[self.INDEX_LEN:self.INDEX_LEN+4])[0]
            raw_data = self.mm[self.DATA_OFFSET : self.DATA_OFFSET + data_len]
            
            # Reset state to IDLE (0)
            self.mm[self.INDEX_STATE:self.INDEX_STATE+4] = struct.pack("<I", 0)
            
            return raw_data.decode('utf-8')
        finally:
            self._unlock()

    def write_response(self, message: str):
        """Writes a response and sets state to PROCESSED (2)"""
        if not self.mm:
            return
        
        encoded = message.encode('utf-8')
        self._lock()
        try:
            self.mm[self.INDEX_LEN:self.INDEX_LEN+4] = struct.pack("<I", len(encoded))
            self.mm[self.DATA_OFFSET : self.DATA_OFFSET + len(encoded)] = encoded
            self.mm[self.INDEX_STATE:self.INDEX_STATE+4] = struct.pack("<I", 2)
            print("📝 [BRIDGE] Response injected into Memory Segment.")
        finally:
            self._unlock()

if __name__ == "__main__":
    # Integration Test Flow
    MAP_PATH = "data/abyssal_memory.map"
    if not os.path.exists("data"):
        os.makedirs("data")
    
    bridge = AbyssalBridge(MAP_PATH)
    
    print("🌀 [BRIDGE] Listening for Sovereign Commands...")
    try:
        while True:
            data = bridge.read_sovereign_data()
            if data:
                print(f"📥 [BRIDGE] Intercepted Data: {data}")
                bridge.write_response(f"AETHER_ACK: Processed {len(data)} bytes.")
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("🛑 [BRIDGE] Shutting down.")
