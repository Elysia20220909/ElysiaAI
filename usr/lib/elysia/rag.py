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
        
        # Initialize Milvus Client (Lite mode)
        self.client = MilvusClient(self.db_path)
        
        # Initialize Embedding Model
        # This will download the model weights (~80MB) on first run
        logger.info("Loading embedding model: all-MiniLM-L6-v2...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self._setup_collection()

    def _setup_collection(self):
        """Create collection if it doesn't exist"""
        if self.client.has_collection(self.collection_name):
            # For development, we skip recreation. 
            # In production, we might want to check schema or version.
            return
            
        self.client.create_collection(
            collection_name=self.collection_name,
            dimension=384,  # Dimension for all-MiniLM-L6-v2
            primary_field_name="id",
            id_type="int",
            auto_id=True
        )
        logger.info(f"Collection '{self.collection_name}' created in Milvus Lite.")

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
                if file.endswith('.md'):
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
        """Perform semantic search for the query"""
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
                # Milvus Lite returns distance/score
                formatted_results.append((hit['distance'], hit['entity']))
                
        return formatted_results

# Global Instance
_brain = None

def get_brain(docs_dir: str):
    global _brain
    if _brain is None:
        _brain = ElysiaRAG(docs_dir)
        # We index on first retrieval if empty
        _brain.index_docs()
    return _brain
