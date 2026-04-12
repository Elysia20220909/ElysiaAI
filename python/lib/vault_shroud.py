import hashlib
import os
import platform
import uuid

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class AbyssalShroud:
    """
    Handles hardware-bound key derivation and AES-256-GCM encryption.
    Ensures data remains 'submerged' and unreadable outside the local host.
    """

    def __init__(self, salt: bytes = b"ABYSSAL_SINGULARITY_SALT_2026"):
        self.key = self._derive_machine_key(salt)
        self.cipher = AESGCM(self.key)

    def _derive_machine_key(self, salt: bytes) -> bytes:
        """Derives a machine-unique 256-bit key."""
        # Hardware identifiers
        mac = str(uuid.getnode())
        node = platform.node()
        machine = platform.machine()

        # Combine into a unique seed
        seed = f"{mac}:{node}:{machine}:ELYSIAN_WILL".encode()

        # PBKDF2-like derivation via SHA256
        # Iterating for "Deep Sea" depth
        k = seed
        for _ in range(1000):
            k = hashlib.sha256(k + salt).digest()

        return k

    def encrypt(self, data: bytes) -> bytes:
        """Encrypts data using AES-GCM (Authenticated Encryption)."""
        nonce = os.urandom(12)
        # Auth data can be empty or used for versioning
        ciphertext = self.cipher.encrypt(nonce, data, None)
        # Result is [nonce (12b)] + [ciphertext + tag]
        return nonce + ciphertext

    def decrypt(self, shrouded_data: bytes) -> bytes:
        """Decrypts AES-GCM shrouded data."""
        if len(shrouded_data) < 13:
            raise ValueError("Abyssal Integrity Failure: Data too short.")

        nonce = shrouded_data[:12]
        ciphertext = shrouded_data[12:]
        return self.cipher.decrypt(nonce, ciphertext, None)

    def shroud_file(self, path: str):
        """Encrypts a file in place."""
        if not os.path.exists(path):
            return
        with open(path, "rb") as f:
            data = f.read()
        encrypted = self.encrypt(data)
        with open(path, "wb") as f:
            f.write(encrypted)

    def unshroud_file(self, path: str) -> bytes:
        """Reads and decrypts a shrouded file."""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Void Error: {path} not found.")
        with open(path, "rb") as f:
            enc_data = f.read()
        return self.decrypt(enc_data)


# Global Instance
shroud = AbyssalShroud()

if __name__ == "__main__":
    # Test
    test_msg = b"Elysia is an angel."
    enc = shroud.encrypt(test_msg)
    dec = shroud.decrypt(enc)
    print(f"Original: {test_msg}")
    print(f"Encrypted (Hex): {enc.hex()[:32]}...")
    print(f"Decrypted: {dec}")
    assert test_msg == dec
    print("✅ Abyssal Shroud test passed.")
