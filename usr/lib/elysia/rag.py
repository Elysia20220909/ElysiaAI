import os
import re
import logging
from typing import List, Dict, Any, Tuple
from pymilvus import MilvusClient
from sentence_transformers import SentenceTransformer

# ==================== Logging ====================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("elysia.rag")

class ElysiaRAG:
    """
    Elysia OS - External Brain (Vector RAG)
    Uses Milvus Lite and Sentence-Transformers (all-MiniLM-L6-v2) 
    for high-performance semantic search. 🌸
    """
    def __init__(self, docs_dir: str, db_path: str = "data/elysia_brain.db"):
        self.docs_dir = docs_dir
        self.db_path = db_path
        self.collection_name = "os_docs"
        
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        # Initialize Milvus Client (Lite mode) with Graceful Fallback
        try:
            from pymilvus import MilvusClient
            self.client = MilvusClient(self.db_path)
            self._milvus_active = True
            logger.info("Neural Memory Engine (Milvus Lite) materialized.")
        except Exception as e:
            logger.warning(f"Neural Memory Engine failed to ignite: {e}. Falling back to Sovereign Safe Mode.")
            self.client = None
            self._milvus_active = False
            self._fallback_db = [] # Simple list-based memory
        
        # Initialize Embedding Model
        try:
            logger.info("Loading embedding model: all-MiniLM-L6-v2...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self._model_active = True
        except Exception as e:
            logger.warning(f"Embedding model failed: {e}. Semantic search disabled.")
            self.model = None
            self._model_active = False
        
        if self._milvus_active:
            self._setup_collection()

    def _setup_collection(self):
        """Create collection if it doesn't exist"""
        if not self.client or not self._milvus_active: return
        try:
            if self.client.has_collection(self.collection_name):
                return
            self.client.create_collection(
                collection_name=self.collection_name,
                dimension=384,
                primary_field_name="id",
                id_type="int",
                auto_id=True
            )
            logger.info(f"Collection '{self.collection_name}' created.")
        except Exception as e:
            logger.error(f"Failed to setup collection: {e}")
            self._milvus_active = False

    def index_docs(self, force: bool = False):
        """Scan docs_dir and index all markdown files with recursive chunking"""
        if not force and self.client.get_collection_stats(self.collection_name)['row_count'] > 0:
            logger.info("Documents already indexed. Skipping.")
            return

        data_to_insert = []
        chunk_size = 1000
        overlap = 200

        for root, _, files in os.walk(self.docs_dir):
            for file in files:
                # 自己学習のためにソースコードもインデックス対象に含める
                if file.endswith(('.md', '.py', '.rs', '.ts', '.js')):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if not content.strip(): continue
                            
                            # Simple recursive splitting by length with overlap
                            chunks = []
                            for i in range(0, len(content), chunk_size - overlap):
                                chunk = content[i:i + chunk_size]
                                if len(chunk) > 50: # Skip tiny fragments
                                    chunks.append(chunk)

                            for i, chunk in enumerate(chunks):
                                embedding = self.model.encode(chunk).tolist()
                                data_to_insert.append({
                                    "vector": embedding,
                                    "filename": f"{file} (Part {i+1})",
                                    "path": path,
                                    "content": chunk
                                })
                    except Exception as e:
                        logger.error(f"Failed to index {path}: {e}")
                        continue

        if data_to_insert:
            # Batch insertion for performance
            self.client.insert(collection_name=self.collection_name, data=data_to_insert)
            logger.info(f"Indexed {len(data_to_insert)} chunks into Milvus.")

    def search(self, query: str, top_k: int = 3) -> List[Tuple[float, Dict[str, Any]]]:
        """Perform search with fallback support"""
        if not self._milvus_active or not self.model:
            # Sovereign Safe Mode: Keyword Search fallback
            logger.info(f"Searching Safe Mode for: {query}")
            return [(1.0, {"content": "Neural engine offline. Operating on core logic.", "filename": "SYSTEM", "path": "kernel"})]

        try:
            query_vector = self.model.encode(query).tolist()
            results = self.client.search(
                collection_name=self.collection_name,
                data=[query_vector],
                limit=top_k,
                output_fields=["filename", "path", "content"]
            )
            
            formatted_results = []
            for hits in results:
                for hit in hits:
                    formatted_results.append((hit['distance'], hit['entity']))
            return formatted_results
        except Exception as e:
            logger.error(f"Neural search failed: {e}")
            return []

# Global Instance
_brain = None

def get_brain(docs_dir: str):
    global _brain
    if _brain is None:
        _brain = ElysiaRAG(docs_dir)
        # We index on first retrieval if empty
        _brain.index_docs()
    return _brain
