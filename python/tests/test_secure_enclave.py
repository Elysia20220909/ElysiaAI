import pytest
from usr.lib.elysia.secure_enclave import SecureEnclave

def test_encryption_decryption():
    enclave = SecureEnclave(secret="test-secret-salt-32-chars-long-!!")
    original = "Deep within the Abyss, truth resides."
    encrypted = enclave.encrypt(original)
    
    assert ":" in encrypted
    assert encrypted.count(":") == 2 # nonce:tag:ciphertext
    
    decrypted = enclave.decrypt(encrypted)
    assert decrypted == original

def test_tampering_detection():
    enclave = SecureEnclave(secret="test-secret-salt-32-chars-long-!!")
    encrypted = enclave.encrypt("Untampered")
    nonce, tag, ciphertext = encrypted.split(":")
    
    # Tamper with ciphertext
    tampered_ciphertext = ciphertext[:-2] + "ff"
    tampered = f"{nonce}:{tag}:{tampered_ciphertext}"
    
    decrypted = enclave.decrypt(tampered)
    assert "ENCRYPTION ERROR" in decrypted

def test_empty_string():
    enclave = SecureEnclave(secret="test-secret-salt-32-chars-long-!!")
    encrypted = enclave.encrypt("")
    assert encrypted == ""
    assert enclave.decrypt("") == ""

def test_parity_logic():
    # This test verifies that we are using the same format as the server
    enclave = SecureEnclave(secret="matching-secret")
    encrypted = enclave.encrypt("Parity Check")
    parts = encrypted.split(":")
    assert len(parts) == 3
