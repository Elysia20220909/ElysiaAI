import os
import sys

from python.lib.vault_shroud import shroud


def audit_abyssal_vault():
    print("~~~ [ Abyssal Stealth Audit ] ~~~")
    print("----------------------------------------")

    vault_file = "elysia_memory.vault"

    # 1. Check if file exists
    if not os.path.exists(vault_file):
        print(f"!! Vault file not found: {vault_file}. (Maybe no memories saved yet?)")
        # Create a dummy for testing if it doesn't exist
        from src.memory_vault import MemoryVault

        v = MemoryVault(vault_file)
        v.save_memory("Audit Test", "Submerged", "stealth")
        v.close()
        print(f">> Created test vault: {vault_file}")

    # 2. Verify Encryption (Hex Dump Check)
    with open(vault_file, "rb") as f:
        header = f.read(16)
        print(f">> Vault Header: {header.hex().upper()}")

        # SQLite header check
        if b"SQLite format" in header:
            print("[!!] AUDIT FAILURE: Vault is in plain-text SQLite format!")
            sys.exit(1)
        else:
            print("[OK] VAULT SECURE: No plain-text database signatures detected.")

    # 3. Verify Decryption
    try:
        decrypted = shroud.unshroud_file(vault_file)
        if b"SQLite format" in decrypted[:16]:
            print("[OK] DECRYPTION VERIFIED: Data correctly recovered from the Void.")
        else:
            print("[!!] DECRYPTION FAILURE: Recovered data is corrupted or incorrectly shrouded.")
            sys.exit(1)
    except Exception as e:
        print(f"[!!] DECRYPTION ERROR: {e}")
        sys.exit(1)

    print("----------------------------------------")
    print("AUDIT COMPLETE: System is fully Submerged at 'Deep Sea' level.")


if __name__ == "__main__":
    audit_abyssal_vault()
