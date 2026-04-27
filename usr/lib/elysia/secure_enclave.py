import base64
import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pathlib import Path
from dotenv import load_dotenv

# Load environment
PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

JWT_SECRET = os.getenv("JWT_SECRET", "elysia-default-secret-salt-123")

class SecureEnclave:
    """
    Sovereign Security Module - Parity with Node.js secureVault (AES-256-GCM)
    Uses scrypt KDF to match Node.js scryptSync(secret, salt, 32)
    """
    def __init__(self, secret: str = JWT_SECRET):
        # Match Node.js scryptSync(secret, "elysia-salt", 32)
        # Default Node.js scrypt params: N=16384, r=8, p=1
        self.key = hashlib.scrypt(
            password=secret.encode(),
            salt=b"elysia-salt",
            n=16384,
            r=8,
            p=1,
            maxmem=32 * 1024 * 1024,
            dklen=32
        )
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, text: str) -> str:
        if not text:
            return ""
        nonce = os.urandom(12) # GCM recommended nonce size
        encrypted = self.aesgcm.encrypt(nonce, text.encode(), None)
        # In cryptography library, auth tag is appended to ciphertext
        # We'll use the same format as the server: iv:tag:ciphertext
        # But cryptography returns tag appended. We can split it or just keep it as 2 parts.
        # Server format: iv:tag:ciphertext (all hex)
        # cryptography encrypt output is tag + ciphertext (or vice versa depending on implementation, 
        # but usually it's [ciphertext][tag])
        # Actually, AESGCM.encrypt returns [ciphertext][tag] of length len(data) + 16
        
        tag_length = 16
        ciphertext_with_tag = encrypted
        ciphertext = ciphertext_with_tag[:-tag_length]
        tag = ciphertext_with_tag[-tag_length:]
        
        return f"{nonce.hex()}:{tag.hex()}:{ciphertext.hex()}"

    def decrypt(self, encrypted_text: str) -> str:
        if not encrypted_text or encrypted_text.count(":") < 2:
            return encrypted_text
        try:
            nonce_hex, tag_hex, ciphertext_hex = encrypted_text.split(":")
            nonce = bytes.fromhex(nonce_hex)
            tag = bytes.fromhex(tag_hex)
            ciphertext = bytes.fromhex(ciphertext_hex)
            
            # Combine ciphertext and tag for cryptography's decrypt
            data = ciphertext + tag
            decrypted = self.aesgcm.decrypt(nonce, data, None)
            return decrypted.decode()
        except Exception as e:
            return f"[ ENCRYPTION ERROR: {str(e)} ]"

secure_enclave = SecureEnclave()
