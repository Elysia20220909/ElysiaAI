import os
import json
import logging
import time # Phase 34
from typing import Dict, List, Any, Optional
from usr.lib.elysia.secure_enclave import sep
import hashlib # Phase 33

logger = logging.getLogger("elysia.pfs")

class PhantomFileSystem:
    """
    Sovereign Phase 30: Phantom File System (PFS).
    Abstracts physical files into Confidentiality Levels (Class A-D).
    Hides 'Abyss' files from standard listing unless authorized.
    """
    def __init__(self):
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        self.registry_path = os.path.join(self.project_root, "var", "elysia", "abyss", "registry.json")
        os.makedirs(os.path.dirname(self.registry_path), exist_ok=True)
        self.registry = self._load_registry()

    def _load_registry(self) -> Dict[str, str]:
        if os.path.exists(self.registry_path):
            try:
                with open(self.registry_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                logger.error("PFS: Registry corruption detected. Re-initializing.")
        
        # Default essential classifications
        default_registry = {
            "var/elysia/soul.json": "A",
            "var/elysia/growth.json": "B",
            "etc/elysia/config.json": "C",
            "usr/lib/elysia/kernel.py": "C",
            "var/lib/elysia/soul.db": "A",
            "var/elysia/vision": "B"
        }
        self._save_registry(default_registry)
        return default_registry

    def _save_registry(self, registry: Dict[str, str]):
        with open(self.registry_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=4, ensure_ascii=False)

    def classify(self, rel_path: str, level: str):
        """Register or update a file's confidentiality level."""
        if level not in ["A", "B", "C", "D"]:
            raise ValueError("Invalid Confidentiality Level (Must be A, B, C, or D)")
        self.registry[rel_path] = level
        self._save_registry(self.registry)
        logger.info(f"🌌 PFS: {rel_path} classified as Class-{level}")

    def get_level(self, rel_path: str) -> str:
        # Default to D (Public) if not in registry
        return self.registry.get(rel_path, "D")

    def list_files(self, current_level: str) -> List[Dict[str, Any]]:
        """
        Lists files visible to the current authorization level.
        Levels hierarchy: A > B > C > D
        """
        visible_files = []
        hierarchy = {"A": 4, "B": 3, "C": 2, "D": 1}
        user_rank = hierarchy.get(current_level, 1)

        for rel_path, file_level in self.registry.items():
            if user_rank >= hierarchy.get(file_level, 1):
                name = os.path.basename(rel_path)
                
                # --- 🌀 Phase 33: Chaos Masking ---
                is_scrambled = False
                if file_level in ["A", "B"] and hasattr(sep, "_chaos_seed") and sep._chaos_seed:
                    name = subliminal.mask_name(name, sep._chaos_seed)
                    is_scrambled = True

                visible_files.append({
                    "path": rel_path,
                    "level": file_level,
                    "name": name,
                    "is_chaos_scrambled": is_scrambled
                })
        
        return visible_files

    def read_secure(self, rel_path: str, user_present: bool) -> bytes:
        """Gated read based on classification and presence. Supports PFK."""
        level = self.get_level(rel_path)
        abs_path = os.path.join(self.project_root, rel_path)
        
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"PFS: {rel_path} dormant in physical space.")

        # Class A Check (Top Secret / Abyss Zero)
        if level == "A":
            if not user_present:
                logger.critical(f"🛡️ PFS: ACCESS_DENIED for Class-A file: {rel_path} (User Absent)")
                raise PermissionError("SOVEREIGN_CLASS_A_PRESENCE_REQUIRED")
        
        # Read data
        with open(abs_path, "rb") as f:
            encrypted_data = f.read()
        
        # --- 🦾 Phase 34: Atomic Decryption ---
        try:
            # Use PFK if session is authorized
            if level in ["A", "B"] and hasattr(sep, "derive_per_file_key") and sep._session_authorized:
                pfk_cipher = sep.derive_per_file_key(rel_path)
                data_dict = json.loads(pfk_cipher.decrypt(encrypted_data).decode('utf-8'))
                return data_dict.get("content", "").encode('utf-8')
            else:
                return encrypted_data # Fallback for non-PFK or raw reads
        except Exception as e:
            logger.error(f"PFS: Atomic decryption failed for {rel_path}: {e}")
            return encrypted_data

    def write_secure(self, rel_path: str, content: bytes, level: str = "B"):
        """Performs Atomic (PFK) write for highly sensitive data."""
        self.classify(rel_path, level)
        abs_path = os.path.join(self.project_root, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        
        data_to_seal = {"content": content.decode('utf-8'), "timestamp": str(time.time())}
        sealed_data = sep.seal(data_to_seal, rel_path=rel_path)
        
        with open(abs_path, "wb") as f:
            f.write(sealed_data)
        logger.info(f"🦾 PFS: Atomic write complete for {rel_path}")

# Global Instance
pfs = PhantomFileSystem()

# Phase 31: Deception & Sharding Engine
import math

class SubliminalEngine:
    """The core engine for sharding and deceptive data generation."""
    
    @staticmethod
    def generate_decoys() -> List[Dict[str, Any]]:
        """Produces realistic honeyfiles for the Deception layer."""
        return [
            {"path": "var/elysia/vault/manifest.vdf", "level": "A", "name": "Abyss_Sovereign_Keys.vdf", "is_decoy": True},
            {"path": "usr/lib/elysia/ai/weights.bin", "level": "B", "name": "Resonance_Weights_Backup.bin", "is_decoy": True},
            {"path": "var/elysia/memory/onii_chan_secret.txt", "level": "A", "name": "Personal_Journal_ENCRYPTED.txt", "is_decoy": True},
            {"path": "etc/elysia/security/emergency_keys.txt", "level": "C", "name": "Emergency_Override_Codes.txt", "is_decoy": True}
        ]

    @staticmethod
    def shard_data(data: bytes, n: int = 4) -> List[bytes]:
        """Shards data into N segments with simple parity/header simulation."""
        chunk_size = math.ceil(len(data) / n)
        shards = []
        for i in range(n):
            chunk = data[i*chunk_size : (i+1)*chunk_size]
            # In a real implementation, we'd add steganographic headers/parity
            shards.append(chunk)
        return shards

    @staticmethod
    def reassemble_data(shards: List[bytes]) -> bytes:
        """Joins sharded chunks back into the original stream."""
        return b"".join(shards)

    @staticmethod
    def mask_name(name: str, seed: bytes) -> str:
        """Phase 33: Mask name using the Entropy Seed (Chaos Obfuscation)."""
        # Create a deterministic but chaotic scrambler for the current session
        chaos_hash = hashlib.sha256(seed + name.encode()).hexdigest()[:12]
        ext = os.path.splitext(name)[1]
        return f"chaos_{chaos_hash}{ext}"

subliminal = SubliminalEngine()
