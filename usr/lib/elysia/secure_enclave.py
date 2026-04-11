import os
import hashlib
import json
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger("elysia.sep")

class SecureEnclave:
    """
    Sovereign Secure Enclave (SEP) Simulation.
    Simulates hardware-bound cryptographic operations and integrity checks.
    """
    def __init__(self, key_path=None):
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        self.key_path = key_path or os.path.join(self.project_root, "var", "elysia", ".secure_enclave_key")
        self.manifest_path = os.path.join(self.project_root, "var", "elysia", "system_manifest.json")
        self._key = self._load_or_generate_key()
        self._cipher = Fernet(self._key)

    def _load_or_generate_key(self):
        if os.path.exists(self.key_path):
            with open(self.key_path, "rb") as f:
                return f.read()
        else:
            logger.warning("🗝️ SEP: Hardware Key not found. Provisioning new Secure Enclave Key...")
            key = Fernet.generate_key()
            os.makedirs(os.path.dirname(self.key_path), exist_ok=True)
            with open(self.key_path, "wb") as f:
                f.write(key)
            return key

    def seal(self, data: dict) -> bytes:
        """Encrypts dictionary data into a sealed byte string."""
        json_data = json.dumps(data).encode('utf-8')
        return self._cipher.encrypt(json_data)

    def unseal(self, encrypted_data: bytes) -> dict:
        """Decrypts sealed byte string back into a dictionary."""
        try:
            decrypted_data = self._cipher.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode('utf-8'))
        except Exception as e:
            logger.error(f"🛡️ SEP Critical: Unseal failure. Integrity compromised? {e}")
            raise PermissionError("SECURE_ENCLAVE_DECRYPTION_FAILED")

    def calculate_hash(self, file_path: str) -> str:
        """Calculates SHA-256 hash of a file."""
        sha256_hash = hashlib.sha256()
        abs_path = os.path.join(self.project_root, file_path)
        if not os.path.exists(abs_path):
            return ""
        with open(abs_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def update_manifest(self, paths: list):
        """Generates and saves a signed manifest of system file hashes."""
        manifest = {
            "version": "1.0",
            "signed_by": "Elysia Secure Enclave",
            "hashes": {p: self.calculate_hash(p) for p in paths}
        }
        sealed_manifest = self.seal(manifest)
        with open(self.manifest_path, "wb") as f:
            f.write(sealed_manifest)
        logger.info("📄 SEP: System Manifest signed and sealed.")

    def verify_system(self) -> bool:
        """Verifies current system hashes against the sealed manifest."""
        if not os.path.exists(self.manifest_path):
            logger.error("🛡️ SEP: System Manifest missing! Secure Boot FAILED.")
            return False
        
        try:
            with open(self.manifest_path, "rb") as f:
                manifest = self.unseal(f.read())
            
            for path, expected_hash in manifest.get("hashes", {}).items():
                current_hash = self.calculate_hash(path)
                if current_hash != expected_hash:
                    logger.critical(f"🚨 INTEGRITY BREACH: {path} has been tampered with!")
                    return False
            
            logger.info("✅ SEP: Secure Boot verified. Signed System Volume active.")
            return True
        except Exception as e:
            logger.error(f"🛡️ SEP: Verification error: {e}")
            return False

# Singleton instance
sep = SecureEnclave()
