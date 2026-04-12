import io
import json
import os
import time
import uuid

from python.lib.vault_shroud import shroud


class FilePhantom:
    """
    The 'Ghost' File System.
    Shatters sensitive files into encrypted shards and distributes them
    across the system. Only re-assembles them in-memory (Phantom State).
    """

    def __init__(self):
        self.data_dir = "python/data/shards"
        self.registry_path = "python/data/phantom_registry.vault"
        self.shard_locations = ["python/data/shards", "usr/lib/elysia/shards", ".github/assets/shards"]

        # Ensure directories exist
        for loc in self.shard_locations:
            os.makedirs(loc, exist_ok=True)

    def _get_registry(self) -> dict:
        """Loads the encrypted registry of phantom files."""
        if not os.path.exists(self.registry_path):
            return {}
        try:
            data = shroud.unshroud_file(self.registry_path)
            return json.loads(data.decode("utf-8"))
        except Exception:
            return {}

    def _save_registry(self, registry: dict):
        """Saves the encrypted registry."""
        data = json.dumps(registry).encode("utf-8")
        encrypted = shroud.encrypt(data)
        with open(self.registry_path, "wb") as f:
            f.write(encrypted)

    def submerge(self, file_path: str, shard_count: int = 3) -> str:
        """
        Shatters a file into shards and hides them with descriptive locations.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_name = os.path.basename(file_path)
        phantom_id = str(uuid.uuid4())

        with open(file_path, "rb") as f:
            data = f.read()

        chunk_size = len(data) // shard_count
        shards = []
        shard_labels = {
            "python/data/shards": "Abyssal Core",
            "usr/lib/elysia/shards": "Deep Sea Library",
            ".github/assets/shards": "Void Registry",
        }

        for i in range(shard_count):
            start = i * chunk_size
            end = (i + 1) * chunk_size if i < shard_count - 1 else len(data)
            chunk = data[start:end]

            shard_data = shroud.encrypt(chunk)

            loc = self.shard_locations[i % len(self.shard_locations)]
            shard_name = f"{phantom_id}.shard.{i}"
            shard_path = os.path.join(loc, shard_name)

            with open(shard_path, "wb") as f:
                f.write(shard_data)

            shards.append({"path": shard_path, "label": shard_labels.get(loc, "Unknown Void")})

        # Update Registry
        registry = self._get_registry()
        registry[phantom_id] = {
            "name": file_name,
            "original_size": len(data),
            "shards": shards,
            "created_at": str(time.time()),
            "resonance": 1.0,  # Initial integrity
        }
        self._save_registry(registry)
        os.remove(file_path)
        return phantom_id

    def list_submerged(self) -> list[dict]:
        """Lists all files with shard health metrics."""
        registry = self._get_registry()
        output = []
        for pid, meta in registry.items():
            # Check shard existence (Micro-integrity check)
            healthy_shards = 0
            for shard in meta["shards"]:
                if os.path.exists(shard["path"]):
                    healthy_shards += 1

            output.append(
                {
                    "id": pid,
                    "name": meta["name"],
                    "shard_count": len(meta["shards"]),
                    "healthy_count": healthy_shards,
                    "integrity": (healthy_shards / len(meta["shards"])) if meta["shards"] else 0,
                    "shards": meta["shards"],
                }
            )
        return output

    def materialize(self, phantom_id: str) -> io.BytesIO | None:
        """
        Re-assembles the fragmented file from the Abyss into memory.
        """
        registry = self._get_registry()
        meta = registry.get(phantom_id)
        if not meta:
            return None

        assembled_data = bytearray()
        try:
            for shard in meta["shards"]:
                shard_path = shard["path"]
                if not os.path.exists(shard_path):
                    raise FileNotFoundError(f"Shard {shard_path} has been purged.")

                with open(shard_path, "rb") as f:
                    enc_shard = f.read()

                chunk = shroud.decrypt(enc_shard)
                assembled_data.extend(chunk)

            return io.BytesIO(assembled_data)
        except Exception as e:
            print(f"Abyssal Reconstruction Failure: {e}")
            return None


# Global Instance
phantom = FilePhantom()
