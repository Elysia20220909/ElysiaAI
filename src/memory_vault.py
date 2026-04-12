import datetime
import os
import sqlite3

from python.lib.vault_shroud import shroud


DB_PATH = os.getenv("ELYSIA_MEMORY_VAULT", "python/data/elysia_memory.vault")


class MemoryVault:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._conn = None
        self._load_vault()

    def _load_vault(self):
        """Loads and decrypts the vault into an in-memory SQLite DB."""
        # Create in-memory connection
        self._conn = sqlite3.connect(":memory:", check_same_thread=False)

        if os.path.exists(self.db_path):
            try:
                # Decrypt the vault file
                decrypted_data = shroud.unshroud_file(self.db_path)

                # Load the decrypted SQL script into memory
                # (For simplicity and maximum stealth, we store the DB as an SQL dump or
                # use the backup API to load from a temp buffer)
                # We can't easily 'load' directly from bytes to :memory: without a temp file
                # unless we use the backup API with a transient source.

                # Shrouded storage strategy: We'll use a temporary, hidden decrypted file
                # that is deleted immediately after connection.
                temp_path = f"{self.db_path}.tmp"
                with open(temp_path, "wb") as f:
                    f.write(decrypted_data)

                disk_conn = sqlite3.connect(temp_path)
                disk_conn.backup(self._conn)
                disk_conn.close()
                os.remove(temp_path)

            except Exception as e:
                print(f"⚠️ Abyssal Vault: Failed to load shroud ({e}). Initializing new void.")
                self._init_db()
        else:
            self._init_db()

    def _save_vault(self):
        """Encrypts and saves the in-memory DB back to the vault file."""
        temp_path = f"{self.db_path}.tmp"
        disk_conn = sqlite3.connect(temp_path)
        self._conn.backup(disk_conn)
        disk_conn.close()

        with open(temp_path, "rb") as f:
            data = f.read()

        shrouded_data = shroud.encrypt(data)
        with open(self.db_path, "wb") as f:
            f.write(shrouded_data)

        os.remove(temp_path)

    def _init_db(self):
        cursor = self._conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_input TEXT NOT NULL,
                elysia_response TEXT NOT NULL,
                emotion_state TEXT
            )
        """)
        self._conn.commit()

    def save_memory(self, user_input, elysia_response, emotion_state="calm"):
        cursor = self._conn.cursor()
        timestamp = datetime.datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO memories (timestamp, user_input, elysia_response, emotion_state)
            VALUES (?, ?, ?, ?)
        """,
            (timestamp, user_input, elysia_response, emotion_state),
        )
        self._conn.commit()
        # Persist to disk (shrouded)
        self._save_vault()

    def get_recent_memories(self, limit=5):
        cursor = self._conn.cursor()
        cursor.execute(
            """
            SELECT timestamp, user_input, elysia_response, emotion_state 
            FROM memories 
            ORDER BY timestamp DESC 
            LIMIT ?
        """,
            (limit,),
        )
        return cursor.fetchall()

    def count_memories(self):
        cursor = self._conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM memories")
        return cursor.fetchone()[0]

    def close(self):
        if self._conn:
            self._save_vault()
            self._conn.close()


if __name__ == "__main__":
    # Test initialization with shrouding
    vault = MemoryVault("test_abyssal.vault")
    vault.save_memory("Hello", "Hi there!", "joy")
    print(f"Memories in Vault: {vault.count_memories()}")
    vault.close()

    # Verify file is not plain text
    with open("test_abyssal.vault", "rb") as f:
        head = f.read(16)
        print(f"Vault Header (Encrypted): {head.hex()}")
        assert b"SQLite format" not in head

    print("✅ Abyssal Memory Vault verification complete.")
    if os.path.exists("test_abyssal.vault"):
        os.remove("test_abyssal.vault")
