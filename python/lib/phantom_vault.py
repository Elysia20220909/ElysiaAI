import os
import json
import uuid
import time
import logging
from typing import List, Dict, Any
from python.lib.vault_shroud import shroud

logger = logging.getLogger("PhantomVault")

# Camouflage Header Definitions (Fake Magic Numbers)
CAMOUFLAGE_HEADERS = {
    "bmp": b"BM" + (b"\x00" * 52),  # Minimal BMP header
    "dll": b"MZ" + (b"\x00" * 62),  # Minimal DOS MZ header
    "zip": b"PK\x03\x04" + (b"\x00" * 26), # Minimal ZIP header
    "dat": b"\x00" * 32             # Generic padding
}

class PhantomVault:
    """
    Advanced File Fragmentation & Stealth Camouflage System.
    Shatters videos into encrypted shards disguised as innocuous files.
    """

    def __init__(self, vault_dir: str = "python/data/vault"):
        self.vault_dir = vault_dir
        os.makedirs(self.vault_dir, exist_ok=True)
        self.registry_path = os.path.join(self.vault_dir, "registry.elysia")

    def _get_registry(self) -> Dict[str, Any]:
        if not os.path.exists(self.registry_path):
            return {}
        try:
            # Use unified shroud for registry
            data = shroud.unshroud_file(self.registry_path)
            return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to load registry: {e}")
            return {}

    def _save_registry(self, registry: Dict[str, Any]):
        data = json.dumps(registry)
        shrouded = shroud.encrypt(data)
        with open(self.registry_path, "w", encoding="utf-8") as f:
            f.write(shrouded)

    def shroud_video(self, file_path: str, chunk_size_mb: int = 10, camo_type: str = "dll") -> str:
        """
        Shatters a video into encrypted, camouflaged fragments.
        Returns the Phantom ID.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source video not found: {file_path}")

        file_name = os.path.basename(file_path)
        phantom_id = str(uuid.uuid4())[:8]
        chunk_size = chunk_size_mb * 1024 * 1024
        
        fragments = []
        
        with open(file_path, "rb") as f:
            part_num = 0
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                
                # 1. Encrypt chunk (as string for shroud compatibility or modify shroud for bytes)
                # Actually vault_shroud.py expects strings in encrypt, but let's check it again.
                # It uses data.encode(), so it takes string.
                # For binary, I should probably use base64 or modify vault_shroud.
                # Let's use base64 for now to keep compatibility with existing vault_shroud.
                import base64
                encoded_chunk = base64.b64encode(chunk).decode('utf-8')
                encrypted_data = shroud.encrypt(encoded_chunk)
                
                # 2. Add Camouflage Header
                header = CAMOUFLAGE_HEADERS.get(camo_type, CAMOUFLAGE_HEADERS["dat"])
                final_payload = header + encrypted_data.encode('utf-8')
                
                # 3. Save Fragment
                frag_name = f"sys_cache_{phantom_id}_{part_num:03d}.{camo_type}"
                frag_path = os.path.join(self.vault_dir, frag_name)
                
                with open(frag_path, "wb") as frag_f:
                    frag_f.write(final_payload)
                
                fragments.append({
                    "name": frag_name,
                    "order": part_num,
                    "header_size": len(header)
                })
                part_num += 1

        # 4. Update Registry
        registry = self._get_registry()
        registry[phantom_id] = {
            "original_name": file_name,
            "fragments": fragments,
            "camo_type": camo_type,
            "created_at": time.time(),
            "status": "shrouded"
        }
        self._save_registry(registry)
        
        logger.info(f"Successfully shrouded {file_name} into {len(fragments)} fragments. ID: {phantom_id}")
        return phantom_id

    def reveal_video(self, phantom_id: str, output_path: str = None) -> str:
        """
        Reconstructs the original video from fragments.
        """
        registry = self._get_registry()
        meta = registry.get(phantom_id)
        if not meta:
            raise ValueError(f"Phantom ID {phantom_id} not found in registry.")

        if output_path is None:
            output_path = os.path.join(self.vault_dir, f"revealed_{meta['original_name']}")

        fragments = sorted(meta["fragments"], key=lambda x: x["order"])
        
        with open(output_path, "wb") as out_f:
            for frag_meta in fragments:
                frag_path = os.path.join(self.vault_dir, frag_meta["name"])
                if not os.path.exists(frag_path):
                    raise FileNotFoundError(f"Missing fragment: {frag_path}")
                
                with open(frag_path, "rb") as frag_f:
                    # Skip header
                    frag_f.seek(frag_meta["header_size"])
                    encrypted_str = frag_f.read().decode('utf-8')
                    
                # Decrypt
                encoded_chunk = shroud.decrypt(encrypted_str)
                import base64
                chunk = base64.b64decode(encoded_chunk)
                out_f.write(chunk)

        logger.info(f"Successfully revealed video: {output_path}")
        return output_path

# Global Instance
phantom_vault = PhantomVault()
