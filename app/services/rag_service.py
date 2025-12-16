import chromadb
from chromadb.utils import embedding_functions
import os

# Initialize ChromaDB (Embedded)
# For production this might be a server, but for local python embedded is great.
CHROMA_PATH = os.path.join(os.getcwd(), "chroma_db")

client = chromadb.PersistentClient(path=CHROMA_PATH)

# Use OpenAI embeddings or free local ones (SentenceTransformers)
# Using default (ONNX MiniLM) for zero-config "it just works"
emb_fn = embedding_functions.DefaultEmbeddingFunction()

collection = client.get_or_create_collection(name="winning_proposals", embedding_function=emb_fn)

async def add_document(text: str, meta: dict):
    collection.add(
        documents=[text],
        metadatas=[meta],
        ids=[f"doc_{meta.get('id')}_{os.urandom(4).hex()}"]
    )

async def query_similar(query_text: str, n_results: int = 3) -> list:
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results["documents"][0] if results["documents"] else []
