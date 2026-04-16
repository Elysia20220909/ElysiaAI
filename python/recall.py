#!/usr/bin/env python3
"""
Elysia OS - Abyssal Recall Core (Phase 128)
System-wide semantic memory crawler and indexer.
"""

import logging
from pathlib import Path

from pymilvus import DataType, MilvusClient


logger = logging.getLogger(__name__)


class AbyssalRecall:
    def __init__(self, uri="http://localhost:19530", token=""):
        self.uri = uri
        self.token = token
        self.client = None
        self.collection_name = "abyssal_recall"
        self.dim = 384  # Default for local sentence-transformers
        self._connected = False

    def connect(self):
        try:
            self.client = MilvusClient(uri=self.uri, token=self.token)
            self._connected = True
            logger.info("✅ Abyssal Recall: Connected to Milvus Abyss.")
            self._init_schema()
        except Exception as e:
            logger.error(f"❌ Abyssal Recall: Connection failed: {e}")

    def _init_schema(self):
        if not self.client.has_collection(self.collection_name):
            logger.info(f"🏗️ Initializing Abyssal Recall Collection: {self.collection_name}")
            schema = MilvusClient.create_schema(auto_id=True, enable_dynamic_field=True)
            schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True)
            schema.add_field(field_name="path", datatype=DataType.VARCHAR, max_length=512)
            schema.add_field(field_name="content", datatype=DataType.VARCHAR, max_length=65535)
            schema.add_field(field_name="type", datatype=DataType.VARCHAR, max_length=32)  # 'code', 'ledger', 'docs'
            schema.add_field(field_name="embedding", datatype=DataType.FLOAT_VECTOR, dim=self.dim)

            index_params = self.client.prepare_index_params()
            index_params.add_index(field_name="embedding", index_type="AUTOINDEX", metric_type="COSINE")

            self.client.create_collection(
                collection_name=self.collection_name, schema=schema, index_params=index_params
            )
            logger.info("✅ Abyssal Recall: Schema Manifest established.")

    def crawl_system(self, root_dir=".", embedding_fn=None):
        """Crawls the project and indexes critical files."""
        if not self._connected or not embedding_fn:
            return

        targets = ["kernel/src", "kernel/include", "AEGIS_LEDGER.md", "requirements.txt"]

        for target in targets:
            path = Path(root_dir) / target
            if not path.exists():
                continue

            if path.is_file():
                self._index_file(path, embedding_fn)
            else:
                for subfile in path.rglob("*"):
                    if subfile.is_file() and subfile.suffix in [".c", ".h", ".asm", ".md"]:
                        self._index_file(subfile, embedding_fn)

    def _index_file(self, path: Path, embedding_fn):
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Basic chunking by logic blocks or size
            chunks = [content[i : i + 1500] for i in range(0, len(content), 1200)]

            for chunk in chunks:
                emb = embedding_fn(chunk)
                data = {
                    "path": str(path),
                    "content": chunk,
                    "type": "ledger" if "LEDGER" in path.name else "code",
                    "embedding": emb,
                }
                self.client.insert(collection_name=self.collection_name, data=[data])

            logger.info(f"🔍 Indexed: {path.name} ({len(chunks)} chunks)")
        except Exception as e:
            logger.warning(f"⚠️ Failed to index {path}: {e}")

    def search(self, query_emb, limit=3):
        if not self._connected:
            return []
        search_res = self.client.search(
            collection_name=self.collection_name,
            data=[query_emb],
            limit=limit,
            output_fields=["content", "path", "type"],
        )
        results = []
        for hits in search_res:
            for hit in hits:
                results.append(hit["entity"])
        return results

    def publish_fragment(self, agent, content, embedding):
        """Phase 134: Broadcasts a memory fragment to the mesh."""
        fragment = {"type": "MEMORY_FRAGMENT", "content": content, "embedding": embedding, "origin": agent.node_id}
        agent.whisper(fragment)
        logger.info(f"💾 [ABYSS_SYNC] Published fragment from {agent.node_id}")

    def on_fragment_received(self, data):
        """Phase 134: Recieved a memory fragment from a peer."""
        if not self._connected:
            return

        # Avoid duplication check could be added here
        self.client.insert(
            collection_name=self.collection_name,
            data=[
                {
                    "path": f"mesh://{data['origin']}",
                    "content": data["content"],
                    "type": "mesh",
                    "embedding": data["embedding"],
                }
            ],
        )
        logger.info(f"📥 [ABYSS_SYNC] Integrated fragment from {data['origin']}")


# Shared Instance
abyssal_recall = AbyssalRecall()
