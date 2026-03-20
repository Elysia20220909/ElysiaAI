import sqlite3
import datetime
import os

DB_PATH = os.getenv("ELYSIA_MEMORY_DB", "elysia_memory.db")

class MemoryVault:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_input TEXT NOT NULL,
                    elysia_response TEXT NOT NULL,
                    emotion_state TEXT
                )
            ''')
            conn.commit()

    def save_memory(self, user_input, elysia_response, emotion_state="calm"):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            timestamp = datetime.datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO memories (timestamp, user_input, elysia_response, emotion_state)
                VALUES (?, ?, ?, ?)
            ''', (timestamp, user_input, elysia_response, emotion_state))
            conn.commit()

    def get_recent_memories(self, limit=5):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT timestamp, user_input, elysia_response, emotion_state 
                FROM memories 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
            return cursor.fetchall()
            
    def count_memories(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM memories')
            return cursor.fetchone()[0]

if __name__ == "__main__":
    # Test initialization
    vault = MemoryVault(":memory:")
    print("Memory Vault Initialized Successfully.")
