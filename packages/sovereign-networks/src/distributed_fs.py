import hashlib
import os


# 📂 Abyssal Distributed FS (Phase 171)
# "Content is the Address. Data is Eternal."

class AbyssalDFS:
    def __init__(self, root_dir: str = "data/dfs_storage"):
        self.root_dir = root_dir
        self.dht: dict[str, str] = {} # Mock DHT: Hash -> Local Path
        
        if not os.path.exists(root_dir):
            os.makedirs(root_dir)
            
        print(f"[DFS] Subsystem Initialized at: {root_dir}")

    def _calculate_cid(self, data: bytes) -> str:
        """Calculates the Content Identifier (CID) using SHA-256."""
        sha256_hash = hashlib.sha256(data).hexdigest()
        # IPFS-like prefix (mock)
        return f"Qm{sha256_hash}"

    def add_file(self, content: str) -> str:
        """Adds content to the DFS and returns its CID."""
        data = content.encode('utf-8')
        cid = self._calculate_cid(data)
        
        storage_path = os.path.join(self.root_dir, cid)
        
        if not os.path.exists(storage_path):
            with open(storage_path, "wb") as f:
                f.write(data)
            print(f"[DFS] Stored Content. CID: {cid}")
        else:
            print(f"[DFS] Duplicate Content detected. Reusing CID: {cid}")
            
        # Update DHT (In real IPFS, this would be broadcast to nodes)
        self.dht[cid] = storage_path
        return cid

    def get_file(self, cid: str) -> str | None:
        """Retrieves content by its CID."""
        if cid in self.dht:
            try:
                path = self.dht[cid]
                with open(path, "rb") as f:
                    return f.read().decode('utf-8')
            except Exception as e:
                print(f"[DFS] Retrieval Error: {e}")
                return None
        else:
            print(f"[DFS] Content with CID {cid} not found in local sector.")
            return None

    def simulate_dht_sync(self):
        """Simulates synchronization with other sovereign nodes."""
        print("[DFS] Synchronizing DHT with Abyssal Lattice...")
        # Mock: Logic for merging hash maps
        print(f"[DFS] Sync Complete. Indices: {len(self.dht)}")

# --- Execution Simulation ---
if __name__ == "__main__":
    dfs = AbyssalDFS()
    
    # Adding sovereign fragments
    cid1 = dfs.add_file("PROTCOL_GAUSS_FRAGMENT_01: RSA_INIT")
    cid2 = dfs.add_file("PROTCOL_GAUSS_FRAGMENT_02: AES_GCM_RESONANCE")
    
    print(f"\n[DFS] Retrieving fragment {cid1}:")
    print(f"  Content: {dfs.get_file(cid1)}")
    
    dfs.simulate_dht_sync()
