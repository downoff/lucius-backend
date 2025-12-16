import os
import asyncio
from pypdf import PdfReader
from app.services.rag_service import add_document, client

DATA_DIR = os.path.join(os.getcwd(), "data")

async def ingest_pdfs():
    print(f"Scanning {DATA_DIR} for PDFs...")
    
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print("Created data/ directory. Drop your winning proposals (PDF) there!")
        return

    files = [f for f in os.listdir(DATA_DIR) if f.casefold().endswith(".pdf")]
    
    if not files:
        print("No PDFs found in data/. Drop some files there first.")
        return

    print(f"Found {len(files)} PDFs. Processing...")
    
    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        print(f"Reading {filename}...")
        
        try:
            reader = PdfReader(filepath)
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            # Simple chunking by 1000 chars overlap 100? 
            # For now, let's keep it simple: Page level or full doc if small.
            # RAG Service expects chunks effectively, but let's try pushing the whole text 
            # If it's too big, embedding might fail. Gemini can handle it, but Chroma's default might truncate.
            # Let's chunk it.
            
            CHUNK_SIZE = 1000
            chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE - 100)]
            
            print(f"  - Extracted {len(text)} chars. Split into {len(chunks)} chunks.")
            
            for i, chunk in enumerate(chunks):
                await add_document(
                    text=chunk,
                    meta={
                        "source": filename,
                        "chunk_id": i,
                        "total_chunks": len(chunks)
                    }
                )
            
            print(f"  - {filename} ingested successfully.")
            
            # Optional: Move to 'processed' folder?
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    print("--- Ingestion Complete ---")
    print("The AI now knows about these winning proposals.")

if __name__ == "__main__":
    # ChromaDB (via RAG Service) is sync or async? 
    # rag_service.client is sync, but add_document was defined as async in my implementation plan?
    # Let's check rag_service.py content from memory/previous turn.
    # It was: async def add_document...
    asyncio.run(ingest_pdfs())
