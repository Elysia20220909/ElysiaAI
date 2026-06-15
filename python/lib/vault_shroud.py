import hashlib
import logging
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv


# Load environment variables from root .env
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

logger = logging.getLogger("VaultShroud")


class AbyssalShroud:
    """
    Handles unified AES-256-GCM encryption compatible with the Node.js stack.
    Ensures data integrity and confidentiality across the entire resonance loop.
    """

    def __init__(self):
        self.secret = os.getenv("ENCRYPTION_SECRET", "local development encryption secret only")
        self.salt = os.getenv("ENCRYPTION_SALT", "abyssal-salt")
        self.key = self._derive_key()
        self.cipher = AESGCM(self.key)
        logger.info("🔐 Abyssal Shroud Initialized (Unified AES-256-GCM)")

    def _derive_key(self) -> bytes:
        """
        Derives a 256-bit key using scrypt, matching Node.js scryptSync defaults.
        N=16384, r=8, p=1
        """
        return hashlib.scrypt(self.secret.encode(), salt=self.salt.encode(), n=16384, r=8, p=1, dklen=32)

    def encrypt(self, data: str | bytes, aad: str = "ELYSIOS") -> str:
        """
        Encrypts data and returns a colon-separated string: iv:authTag:ciphertext (hex)
        Matches Node.js implementation in cryptography.ts
        """
        nonce = os.urandom(12)
        payload = data if isinstance(data, bytes) else data.encode()
        # cryptography library's AESGCM.encrypt returns ciphertext + 16-byte tag
        ciphertext_with_tag = self.cipher.encrypt(nonce, payload, aad.encode())

        iv_hex = nonce.hex()
        # The tag is the last 16 bytes
        ciphertext = ciphertext_with_tag[:-16].hex()
        auth_tag = ciphertext_with_tag[-16:].hex()

        return f"{iv_hex}:{auth_tag}:{ciphertext}"

    def decrypt(self, shrouded_data: str, aad: str = "ELYSIOS") -> str:
        """
        Decrypts data formatted as iv:authTag:ciphertext (hex).
        Verifies integrity via GCM auth tag.
        """
        try:
            parts = shrouded_data.split(":")
            if len(parts) != 3:
                raise ValueError("Malformed shrouded data format.")

            iv = bytes.fromhex(parts[0])
            auth_tag = bytes.fromhex(parts[1])
            ciphertext = bytes.fromhex(parts[2])

            # Reconstruct the combined format expected by cryptography library
            payload = ciphertext + auth_tag

            decrypted_bytes = self.cipher.decrypt(iv, payload, aad.encode())
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"🛑 Cryptographic Integrity Violation! {e}")
            raise RuntimeError("INTEGRITY_FAILURE: Data may have been tampered with.")

    def shroud_file(self, path: str):
        """Encrypts a file in place (Text only for unified mode)."""
        if not os.path.exists(path):
            return
        with open(path, encoding="utf-8") as f:
            data = f.read()
        encrypted = self.encrypt(data)
        with open(path, "w", encoding="utf-8") as f:
            f.write(encrypted)

    def unshroud_file(self, path: str) -> str:
        """Reads and decrypts a shrouded file."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Void Error: {path} not found.")
        with open(path, encoding="utf-8") as f:
            enc_data = f.read()
        return self.decrypt(enc_data)


# Global Instance
shroud = AbyssalShroud()

if __name__ == "__main__":
    # Test compatibility
    test_msg = "Resonance is standard."
    enc = shroud.encrypt(test_msg)
    print(f"Encrypted: {enc}")
    dec = shroud.decrypt(enc)
    print(f"Decrypted: {dec}")
    assert test_msg == dec
    print("✅ Abyssal Shroud (Unified) test passed.")
