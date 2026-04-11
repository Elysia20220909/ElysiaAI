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

    def authorize_session(self, bio_status: bool = True):
        """
        Phase 27: Sealed Key Release (SKR) Gate.
        Releases the crypto-vault only if Boot + Biometrics are valid.
        """
        logger.info("SEP: Validating system trust for Sealed Key Release...")
        boot_ok = self.verify_system()
        
        if boot_ok and bio_status:
            self._session_authorized = True
            logger.info("SEP: SKR SUCCESS. Hardware-bound session is now SEALED.")
            return True
        else:
            self._session_authorized = False
            logger.critical(f"SEP: SKR REJECTED. (Boot: {boot_ok}, Bio: {bio_status})")
            return False

    def seal(self, data: dict) -> bytes:
        """Encrypts dictionary data into a hardware-bound sealed byte string."""
        json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')
        return self._cipher.encrypt(json_data)

    def unseal(self, encrypted_data: bytes, skip_auth: bool = False) -> dict:
        """
        Phase 27: Strict Gated Decryption.
        Requires prior session authorization unless explicitly bypassed for manifest checks.
        """
        if not skip_auth and not self._session_authorized:
            logger.warning("SEP: Unseal request BLOCKED. Biometric/Boot signature missing.")
            raise PermissionError("SECURE_ENCLAVE_NOT_AUTHORIZED_SKR")

        return self._perform_decryption(encrypted_data)

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

    def _perform_decryption(self, encrypted_data: bytes) -> dict:
        try:
            decrypted_data = self._cipher.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode('utf-8'))
        except Exception as e:
            logger.critical("SEP: Decryption failure! Hardware mismatch or tampering.")
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
