# LuciusAI - Intelligent Tender Automation Engine

**The "Best-in-Class" Backend for Public Sector Bidding.**

LuciusAI automates the analysis, scoring, and proposal writing for government tenders. It replaces manual proposal management with a high-performance **Hybrid AI Architecture**.

## 🚀 Technical Stack (YC Spring 26 Ready)

*   **Core**: Python 3.13 + FastAPI (Async High-Performance)
*   **Database**: MongoDB Atlas (Flexible Schema for diverse Tender formats)
*   **Memory (RAG)**: ChromaDB (Vector Search for retrieving past winning proposals)

## 🧠 Hybrid AI Engine (The "Brain")

We do not rely on a single model. We route tasks to the best-in-class model for the job:

1.  **The Writer (Google Gemini 1.5 Pro)**: Used for generating Executive Summaries and Methodology sections. Chosen for its fluid prose and massive context awareness.
2.  **The Analyst (Google Gemini 1.5 Pro)**: Used for analyzing massive 100+ page Tender PDF specifications. Chosen for its industry-leading 1M+ token context window.
3.  **The Scorer (OpenAI GPT-4o)**: Used for rapid extraction of deadlines, budgets, and compliance matrices. Chosen for speed and structured JSON output.

## 🏗️ Architecture

```
[ Frontend (React) ] 
       │
      REST
       │
[ FastAPI Backend ] ──── [ MongoDB Atlas ]
       │
   [ LLM Factory ]
       │
       ├──> [ Writing: Claude 3.5 ]
       ├──> [ Context: Gemini 1.5 ]
       └──> [ Data: GPT-4o ]
       │
   [ RAG Service ] ──── [ ChromaDB ]
```

## 🛠️ Setup & Running

1.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Environment Variables**
    Create a `.env` file:
    ```env
    MONGO_URI=mongodb+srv://...
    OPENAI_API_KEY=sk-...
    ANTHROPIC_API_KEY=sk-...
    GOOGLE_API_KEY=AI...
    ```

3.  **Run Server**
    ```bash
    # Uses Uvicorn with auto-reload
    python run.py
    ```

## 🔐 Security & Compliance

*   **JWT Authentication**: Secure stateless session management.
*   **Role-Based Access**: Granular permissions for Agency vs Enterprise users.
*   **Paywall Guard**: Integrated Stripe subscription checks on AI endpoints.

---
*Built for the Future of GovTech.*
