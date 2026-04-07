import os
import re
import math
import collections

class ElysiaRAG:
    """
    Elysia OS - External Brain (RAG Lite)
    Uses optimized TF-IDF for lightning-fast document searching within the OS. 🌸
    """
    def __init__(self, docs_dir):
        self.docs_dir = docs_dir
        self.documents = []  # List of {path, content, tokens}
        self.vocab = set()
        self.idf = {}
        self.index = [] # List of TF-IDF vectors (dicts)

    def tokenize(self, text):
        return re.findall(r'\w+', text.lower())

    def index_docs(self):
        self.documents = []
        for root, dirs, files in os.walk(self.docs_dir):
            for file in files:
                if file.endswith('.md'):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            tokens = self.tokenize(content)
                            if tokens:
                                self.documents.append({
                                    "path": path,
                                    "content": content,
                                    "tokens": tokens,
                                    "filename": file
                                })
                                self.vocab.update(tokens)
                    except:
                        continue

        # Calculate IDF
        num_docs = len(self.documents)
        doc_counts = collections.Counter()
        for doc in self.documents:
            unique_tokens = set(doc["tokens"])
            for token in unique_tokens:
                doc_counts[token] += 1
        
        for token, count in doc_counts.items():
            self.idf[token] = math.log(num_docs / (1 + count))

        # Calculate TF-IDF vectors
        self.index = []
        for doc in self.documents:
            tf = collections.Counter(doc["tokens"])
            tfidf = {t: (count / len(doc["tokens"])) * self.idf.get(t, 0) for t, count in tf.items()}
            self.index.append(tfidf)

    def search(self, query, top_k=3):
        query_tokens = self.tokenize(query)
        if not query_tokens:
            return []

        # Vectorize query
        q_tf = collections.Counter(query_tokens)
        q_tfidf = {t: (count / len(query_tokens)) * self.idf.get(t, 0) for t, count in q_tf.items()}

        results = []
        for i, doc_tfidf in enumerate(self.index):
            # Cosine similarity (simplified since we only care about dot product for ranking)
            score = 0
            for t, val in q_tfidf.items():
                if t in doc_tfidf:
                    score += val * doc_tfidf[t]
            
            if score > 0:
                results.append((score, self.documents[i]))

        results.sort(key=lambda x: x[0], reverse=True)
        return results[:top_k]

# global instance
_brain = None

def get_brain(docs_dir):
    global _brain
    if _brain is None:
        _brain = ElysiaRAG(docs_dir)
        _brain.index_docs()
    return _brain
