#!/usr/bin/env python3
"""
Elysia OS - Memory Vault (v2.0.0)
SQLiteベースの長期記憶システム。エリシアお姉さんの物忘れを防ぎます。🌸
"""
import sqlite3
import os
import time
import json
from typing import List, Dict, Any, Optional
from usr.lib.elysia.secure_enclave import sep # Phase 27

class MemoryVault:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # 1. ユーザーに関する事実 (Facts)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE,
                    value TEXT,
                    confidence REAL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # 2. 会話ログの重要ポイント (Highlights)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS highlights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    content TEXT,
                    emotion TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def learn_fact(self, key: str, value: str, confidence: float = 1.0):
        """ユーザーに関する新しい事実を覚える (Phase 27: Hardware Encrypted)"""
        # Encrypt the value before storing
        sealed_value = sep.seal({"v": value}).decode('utf-8')
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO facts (key, value, confidence, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value=excluded.value,
                    confidence=excluded.confidence,
                    updated_at=CURRENT_TIMESTAMP
            """, (key, sealed_value, confidence))
            conn.commit()

    def get_facts(self) -> Dict[str, str]:
        """覚えているすべての事実を取得 (Phase 27: SKR Decryption)"""
        facts = {}
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM facts")
            for row in cursor.fetchall():
                key, encrypted_val = row
                try:
                    # unseal requires session authorization
                    decrypted = sep.unseal(encrypted_val.encode('utf-8'))
                    facts[key] = decrypted.get("v", "[DECRYPTION_ERROR]")
                except PermissionError:
                    facts[key] = "[LOCKED SEALED_STORAGE]"
                except:
                    facts[key] = "[INTEGRITY_FAULT]"
        return facts

    def add_highlight(self, session_id: str, content: str, emotion: str = "neutral"):
        """重要な会話の内容を記録"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO highlights (session_id, content, emotion)
                VALUES (?, ?, ?)
            """, (session_id, content, emotion))
            conn.commit()

    def get_context_string(self) -> str:
        """AIプロンプトに挿入するための要約テキストを生成"""
        facts = self.get_facts()
        if not facts: return ""
        
        context = "【エリシアが知っているあなたの情報】\n"
        for k, v in facts.items():
            context += f"- {k}: {v}\n"
        return context

# Global Instance
_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "var", "lib", "elysia", "soul.db")
vault = MemoryVault(_db_path)
