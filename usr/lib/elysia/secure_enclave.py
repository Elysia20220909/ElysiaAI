from __future__ import annotations

import hashlib
import hmac
import os


class SecureEnclave:
    def __init__(self, secret: str | None = None) -> None:
        self.secret = (secret or os.getenv("ENCRYPTION_SECRET") or "elysia-dev-secret").encode()

    def _keystream(self, nonce: bytes, length: int) -> bytes:
        blocks: list[bytes] = []
        counter = 0
        while sum(len(block) for block in blocks) < length:
            blocks.append(hashlib.sha256(self.secret + nonce + counter.to_bytes(4, "big")).digest())
            counter += 1
        return b"".join(blocks)[:length]

    def encrypt(self, text: str) -> str:
        if text == "":
            return ""

        nonce = os.urandom(12)
        plaintext = text.encode()
        keystream = self._keystream(nonce, len(plaintext))
        ciphertext = bytes(value ^ key for value, key in zip(plaintext, keystream, strict=True))
        tag = hmac.new(self.secret, nonce + ciphertext, hashlib.sha256).hexdigest()
        return f"{nonce.hex()}:{tag}:{ciphertext.hex()}"

    def decrypt(self, encrypted_text: str) -> str:
        if encrypted_text == "":
            return ""

        try:
            nonce_hex, tag, ciphertext_hex = encrypted_text.split(":")
            nonce = bytes.fromhex(nonce_hex)
            ciphertext = bytes.fromhex(ciphertext_hex)
            expected_tag = hmac.new(self.secret, nonce + ciphertext, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(tag, expected_tag):
                return "[ ENCRYPTION ERROR: DATA CORRUPTED OR KEY MISMATCH ]"

            keystream = self._keystream(nonce, len(ciphertext))
            plaintext = bytes(value ^ key for value, key in zip(ciphertext, keystream, strict=True))
            return plaintext.decode()
        except Exception:
            return "[ ENCRYPTION ERROR: DATA CORRUPTED OR KEY MISMATCH ]"


secure_enclave = SecureEnclave()
