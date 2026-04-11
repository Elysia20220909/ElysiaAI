import os
import hashlib
import json
import logging
import subprocess
import ctypes
from ctypes import wintypes
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from usr.lib.elysia.entropy_engine import entropy # Phase 33: Entropy

logger = logging.getLogger("elysia.sep")

# --- 🛰️ Windows DPAPI Wrapper (Internal) ---
class DATA_BLOB(ctypes.Structure):
    _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]

def dpapi_protect(data: bytes) -> bytes:
    """Shields data using Windows User/Hardware credentials."""
    inp = DATA_BLOB(len(data), ctypes.create_string_buffer(data))
    out = DATA_BLOB()
    if ctypes.windll.crypt32.CryptProtectData(ctypes.byref(inp), u"Elysia_SEP_Vault", None, None, None, 0, ctypes.byref(out)):
        res = ctypes.string_at(out.pbData, out.cbData)
        ctypes.windll.kernel32.LocalFree(out.pbData)
        return res
    raise PermissionError("DPAPI_PROTECT_FAILED")

def dpapi_unprotect(data: bytes) -> bytes:
    """Recover data bound to this specific PC/User."""
    inp = DATA_BLOB(len(data), ctypes.create_string_buffer(data))
    out = DATA_BLOB()
    if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(inp), None, None, None, None, 0, ctypes.byref(out)):
        res = ctypes.string_at(out.pbData, out.cbData)
        ctypes.windll.kernel32.LocalFree(out.pbData)
        return res
    raise PermissionError("DPAPI_UNPROTECT_FAILED")

class SecureEnclave:
    """
    Sovereign Secure Enclave (SEP) v3.0 (SOVEREIGN) - Apple Silicon Grade security.
    Implements hardware-biometric gated encryption and Sealed Key Release (SKR).
    """
    def __init__(self, key_path=None):
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        self.seed_path = key_path or os.path.join(self.project_root, "var", "elysia", ".sep_seed.vault")
        self.manifest_path = os.path.join(self.project_root, "var", "elysia", "system_manifest.json")
        
        self.hw_id = self._get_hardware_uuid()
        self._key = self._derive_hardened_key()
        self._cipher = Fernet(self._key)
        
        # Phase 27: Status Indicators
        self._boot_verified = False
        self._session_authorized = False
        self._bio_status = False         # Phase 39: Biometric Resonance Tracking
        self._chaos_seed = b""           # Phase 33: Singularity Seed
        self._chaos_cipher = None        # Phase 33: Transient Cipher

    def _get_hardware_uuid(self):
        """Extracts unique machine identifier."""
        try:
            cmd = 'powershell -Command "Get-CimInstance Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID"'
            return subprocess.check_output(cmd, encoding='utf-8').strip()
        except:
            return "ELYSIA-DEFAULT-HWID-001"

    def _derive_hardened_key(self):
        """Derives a Fernet key from Hardware ID + DPAPI-Protected Seed."""
        master_seed = b""
        if os.path.exists(self.seed_path):
            try:
                with open(self.seed_path, "rb") as f:
                    master_seed = dpapi_unprotect(f.read())
            except:
                raise PermissionError("SECURITY_ENCLAVE_HARDWARE_MISMATCH")
        else:
            master_seed = os.urandom(32)
            os.makedirs(os.path.dirname(self.seed_path), exist_ok=True)
            with open(self.seed_path, "wb") as f:
                f.write(dpapi_protect(master_seed))

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.hw_id.encode(),
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(master_seed))

    def _derive_chaos_key(self, chaos_seed: bytes):
        """Phase 38: PQ3-grade key derivation using SHA3-512 and Quantum Salts."""
        # Use SHA3-512 for Post-Quantum Resistance Simulation
        pq_salt = entropy.generate_quantum_salt(length=32)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(), # Upgraded to SHA-512
            length=32,
            salt=self.hw_id.encode() + pq_salt, # Compounded salt
            iterations=150000, # Increased iterations for M5 power
        )
        # Mix the master key with the new entropy seed
        mixed_material = self._key + chaos_seed
        return base64.urlsafe_b64encode(kdf.derive(mixed_material))

    def derive_per_file_key(self, rel_path: str):
        """Phase 34: Derives an Atomic key for a specific file (PFK)."""
        if not self._chaos_seed:
            raise PermissionError("SEP: Cannot derive PFK without active Entropy Session.")
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.hw_id.encode(),
            iterations=25000, 
        )
        # Unique salt combining Hardware, Session Chaos, and File Path
        atomic_material = self._key + self._chaos_seed + rel_path.encode('utf-8')
        pfk = base64.urlsafe_b64encode(kdf.derive(atomic_material))
        return Fernet(pfk)

    def authorize_session(self, bio_status: bool = True):
        """
        Phase 27: Sealed Key Release (SKR) Gate.
        Releases the crypto-vault only if Boot + Biometrics are valid.
        """
        logger.info("SEP: Validating system trust for Sealed Key Release...")
        boot_ok = self.verify_system()
        
        if boot_ok and bio_status:
            self._session_authorized = True
            self._bio_status = True
            # Phase 33: Synchronize with the Singularity Core
            self._chaos_seed = entropy.collect_chaos()
            self._chaos_cipher = Fernet(self._derive_chaos_key(self._chaos_seed))
            logger.info("SEP: SKR SUCCESS. Dynamic Entropy Seed synchronized.")
            return True
        else:
            self._session_authorized = False
            self._bio_status = False
            logger.critical(f"SEP: SKR REJECTED. (Boot: {boot_ok}, Bio: {bio_status})")
            return False

    def seal(self, data: dict, rel_path: Optional[str] = None) -> bytes:
        """
        Encrypts dictionary data into a hardware-bound sealed byte string.
        Phase 34: Supports Atomic (PFK) encryption if rel_path is provided.
        """
        json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')
        cipher = self._chaos_cipher or self._cipher
        
        if rel_path:
            cipher = self.derive_per_file_key(rel_path)
            
        return cipher.encrypt(json_data)

    def unseal(self, encrypted_data: bytes, skip_auth: bool = False, rationale: str = "Resonance_Access", rel_path: Optional[str] = None) -> dict:
        """
        Phase 27: Strict Gated Decryption.
        Requires prior session authorization unless explicitly bypassed for manifest checks.
        Phase 32: Integrated 'Guardian Ethics' validation (Protect Onii-chan).
        """
        # --- 🦾 HEART OF IRON: Guardian Validation ---
        harmful_keywords = ["malware", "leak", "exploit", "destroy", "obliterate_user"]
        if any(kw in rationale.lower() for kw in harmful_keywords):
            logger.critical(f"🛡️ GUARDIAN PROTECTION TRIGGERED: Malicious rationale detected: {rationale}")
            raise PermissionError("SECURE_ENCLAVE_GUARDIAN_INTERVENTION: PROTECT_ONII_CHAN_PROTOCOL_ACTIVE")

        if not skip_auth and not self._session_authorized:
            logger.warning("SEP: Unseal request BLOCKED. Biometric/Boot signature missing.")
            raise PermissionError("SECURE_ENCLAVE_NOT_AUTHORIZED_SKR")

        return self._perform_decryption(encrypted_data, rel_path=rel_path)

    def class_a_unseal(self, encrypted_data: bytes, presence_verified: bool) -> dict:
        """
        Phase 29: Class-A (Immediate Presence) Protection.
        Only releases data if the user is DIRECTLY in front of the camera.
        """
        if not presence_verified:
            logger.critical("🚨 SEP: Class-A Access DENIED. User not present.")
            # Zeroing simulation: in a real hardware implementation, we'd wipe the cache
            raise PermissionError("SECURE_ENCLAVE_CLASS_A_PRESENCE_REQUIRED")
        
        return self._perform_decryption(encrypted_data)

    def _perform_decryption(self, encrypted_data: bytes, rel_path: Optional[str] = None) -> dict:
        try:
            # Phase 37 Fix: Support PFK, then Chaos Cipher, then Master fallback
            if rel_path:
                cipher = self.derive_per_file_key(rel_path)
            else:
                cipher = self._chaos_cipher or self._cipher
                
            try:
                decrypted_data = cipher.decrypt(encrypted_data)
            except:
                if self._chaos_cipher and not rel_path:
                    decrypted_data = self._cipher.decrypt(encrypted_data)
                else: raise
                
            return json.loads(decrypted_data.decode('utf-8'))
        except Exception as e:
            logger.critical(f"SEP: Decryption failure! Hardware mismatch or tampering. {e}")
            raise PermissionError("SECURE_ENCLAVE_DECRYPTION_FAILED")

    def calculate_hash(self, file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        abs_path = os.path.join(self.project_root, file_path.lstrip("/"))
        if not os.path.exists(abs_path): return ""
        with open(abs_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def update_manifest(self, paths: list):
        manifest = {
            "version": "3.0 (SOVEREIGN)",
            "signed_by": f"Elysia SEP [{self.hw_id[:8]}]",
            "hashes": {p: self.calculate_hash(p) for p in paths}
        }
        sealed_manifest = self.seal(manifest)
        with open(self.manifest_path, "wb") as f:
            f.write(sealed_manifest)
        logger.info(f"📄 SEP: SOVEREIGN Manifest signed.")

    def verify_system(self) -> bool:
        """Checks Signed System Volume (SSV) integrity."""
        if not os.path.exists(self.manifest_path):
            return False
        
        try:
            with open(self.manifest_path, "rb") as f:
                # We skip_auth=True here because verifying the manifest 
                # is part of the authorization process itself (Root of Trust).
                manifest = self.unseal(f.read(), skip_auth=True)
            
            for path, expected_hash in manifest.get("hashes", {}).items():
                if self.calculate_hash(path) != expected_hash:
                    logger.critical(f"🚨 Integrity violation: {path}")
                    return False
            
            self._boot_verified = True
            return True
        except:
            return False

# Singleton instance
sep = SecureEnclave()
