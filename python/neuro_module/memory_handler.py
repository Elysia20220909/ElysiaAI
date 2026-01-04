"""
Neuro Memory Handler - ChromaDB Integration
Neuro メモリハンドラー (ChromaDB統合)

This module integrates ChromaDB vector database for memory management.
RAG context retrieval and automatic memory generation.
"""

import logging
import os
from typing import List, Dict, Any, Optional
import uuid
import json
from datetime import datetime

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

from .config import NeuroConfig

logger = logging.getLogger(__name__)


class MemoryHandler:
    """
    Handles memory persistence and retrieval using ChromaDB.
    Supports both auto-generated (short-term) and manual (long-term) memories.
    """

    def __init__(self, config: Optional[NeuroConfig] = None):
        self.config = config or NeuroConfig()
        self.chroma_client = None
        self.collection = None
        self.processed_count = 0

        if not CHROMADB_AVAILABLE:
            logger.warning("ChromaDB not available. Memory features will be disabled.")
            return

        # Initialize ChromaDB
        self._initialize_chromadb()

    def _initialize_chromadb(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Ensure directory exists
            os.makedirs(self.config.MEMORY_DB_PATH, exist_ok=True)

            self.chroma_client = chromadb.PersistentClient(
                path=self.config.MEMORY_DB_PATH,
                settings=Settings(anonymized_telemetry=False)
            )

            self.collection = self.chroma_client.get_or_create_collection(
                name=self.config.MEMORY_COLLECTION_NAME
            )

            memory_count = self.collection.count()
            logger.info(f"✅ ChromaDB initialized. Loaded {memory_count} memories.")

            # Load initial memories if database is empty
            if memory_count == 0:
                initial_memory_path = os.path.join(
                    self.config.MEMORY_DB_PATH, "memoryinit.json"
                )
                if os.path.exists(initial_memory_path):
                    logger.info("Loading initial memories from memoryinit.json")
                    self.import_memories(initial_memory_path)

        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB: {e}")
            self.chroma_client = None
            self.collection = None

    def query_memories(
        self,
        query_text: str,
        n_results: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Query memories based on semantic similarity.

        Args:
            query_text: Query string
            n_results: Number of results to return (default: MEMORY_RECALL_COUNT)

        Returns:
            Dictionary with queried memories and similarity scores
        """
        if not self.collection:
            logger.warning("Memory collection not initialized")
            return {"memories": [], "scores": []}

        n_results = n_results or self.config.MEMORY_RECALL_COUNT

        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results
            )

            # Format results
            memories = []
            scores = []

            if results["ids"] and len(results["ids"]) > 0:
                for i in range(len(results["ids"][0])):
                    memories.append({
                        "id": results["ids"][0][i],
                        "document": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if "distances" in results else 0
                    })

            return {
                "memories": memories,
                "query": query_text,
                "count": len(memories)
            }

        except Exception as e:
            logger.error(f"❌ Memory query failed: {e}")
            return {"memories": [], "scores": []}

    def create_memory(
        self,
        document: str,
        metadata: Optional[Dict[str, Any]] = None,
        memory_id: Optional[str] = None
    ) -> str:
        """
        Create a new memory entry.

        Args:
            document: Memory content/text
            metadata: Optional metadata (e.g., {"type": "short-term"})
            memory_id: Optional custom ID (default: UUID)

        Returns:
            Memory ID
        """
        if not self.collection:
            logger.warning("Memory collection not initialized")
            return ""

        try:
            memory_id = memory_id or str(uuid.uuid4())
            default_metadata = {"type": "short-term", "created_at": datetime.now().isoformat()}
            default_metadata.update(metadata or {})

            self.collection.upsert(
                ids=[memory_id],
                documents=[document],
                metadatas=[default_metadata]
            )

            logger.info(f"✅ Memory created: {memory_id}")
            return memory_id

        except Exception as e:
            logger.error(f"❌ Failed to create memory: {e}")
            return ""

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID"""
        if not self.collection:
            return False

        try:
            self.collection.delete(ids=[memory_id])
            logger.info(f"✅ Memory deleted: {memory_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete memory: {e}")
            return False

    def get_all_memories(self) -> List[Dict[str, Any]]:
        """Get all memories from the database"""
        if not self.collection:
            return []

        try:
            results = self.collection.get()
            memories = []

            for i in range(len(results["ids"])):
                memories.append({
                    "id": results["ids"][i],
                    "document": results["documents"][i],
                    "metadata": results["metadatas"][i] if results["metadatas"] else {}
                })

            return memories
        except Exception as e:
            logger.error(f"❌ Failed to get all memories: {e}")
            return []

    def clear_memories(self, memory_type: Optional[str] = None) -> bool:
        """
        Clear memories by type.

        Args:
            memory_type: Type of memory to clear ("short-term", "long-term", or None for all)

        Returns:
            True if successful
        """
        if not self.collection:
            return False

        try:
            if memory_type:
                memories = self.collection.get(where={"type": memory_type})
                for memory_id in memories["ids"]:
                    self.collection.delete(ids=[memory_id])
                logger.info(f"✅ Cleared {len(memories['ids'])} {memory_type} memories")
            else:
                self.chroma_client.delete_collection(
                    name=self.config.MEMORY_COLLECTION_NAME
                )
                self.collection = self.chroma_client.get_or_create_collection(
                    name=self.config.MEMORY_COLLECTION_NAME
                )
                logger.info("✅ All memories cleared")

            return True
        except Exception as e:
            logger.error(f"❌ Failed to clear memories: {e}")
            return False

    def export_memories(self, output_path: str) -> bool:
        """Export memories to JSON file"""
        if not self.collection:
            return False

        try:
            memories = self.get_all_memories()
            data = {"memories": memories}

            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"✅ Exported {len(memories)} memories to {output_path}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to export memories: {e}")
            return False

    def import_memories(self, input_path: str) -> bool:
        """Import memories from JSON file"""
        if not self.collection:
            return False

        try:
            with open(input_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for memory in data.get("memories", []):
                self.collection.upsert(
                    ids=[memory["id"]],
                    documents=[memory["document"]],
                    metadatas=[memory.get("metadata", {})]
                )

            logger.info(f"✅ Imported {len(data['memories'])} memories from {input_path}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to import memories: {e}")
            return False
