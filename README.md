<div align="center">
  <h1>🧠 DocMind</h1>
  <p><strong>RAG-Powered Document Intelligence Platform</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs" />
    <img src="https://img.shields.io/badge/Next.js-React-black?logo=react" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas_Vector_Search-47A248?logo=mongodb" />
    <img src="https://img.shields.io/badge/Groq-Llama_3.3_70B-orange" />
    <img src="https://img.shields.io/badge/Gemini-text--embedding--004-blue?logo=google" />
    <img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions" />
  </p>
</div>

---

## What is DocMind?

DocMind is a production-grade document intelligence platform. Upload PDF, DOCX, or TXT documents — then ask questions and get answers with **inline citations** tracing back to the exact source chunk.

Every answer is grounded. Hallucinations are prevented by design.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DocMind Architecture                      │
├──────────────────────┬──────────────────────────────────────────┤
│  FRONTEND (React)    │  BACKEND (Node.js / Express)             │
│  ─────────────────   │  ────────────────────────────────────    │
│  • ChatWindow        │  • FastAPI-style REST endpoints          │
│  • CitationPanel     │  • JWT authentication                    │
│  • Analytics Page    │  • Rate limiting (3-tier)                │
│  • Settings (RAG)    │  • Document processing pipeline          │
└──────────────────────┴──────────────────────────────────────────┘
                                │
          ┌─────────────────────┴──────────────────────┐
          │           RETRIEVAL PIPELINE                │
          │                                             │
          │  1. Upload → Extract Text (PDF/DOCX/TXT)   │
          │  2. Token-Aware Chunking (350–450 tokens,   │
          │     12% overlap, gpt-tokenizer)             │
          │  3. Embed (Gemini text-embedding-004, 768d) │
          │  4. Store → MongoDB Atlas Vector Search     │
          │  5. Query:                                  │
          │     a. HyDE → hypothetical answer embedding │
          │     b. $vectorSearch HNSW aggregation       │
          │     c. Top-K chunks retrieved               │
          │     d. Groq Llama 3.3 70B generates answer │
          │     e. Inline [1][2] citations injected     │
          └─────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Details |
|---|---|
| **HyDE Retrieval** | Generates a hypothetical answer, embeds it, uses that vector for retrieval. Pushes precision from ~60% → ~85% |
| **Atlas Vector Search** | MongoDB HNSW index via `$vectorSearch` aggregation — sub-100ms retrieval |
| **Token-Aware Chunking** | Variable 350–450 token windows with 12% overlap using `gpt-tokenizer` |
| **Inline Citations** | Every answer includes `[1]`, `[2]` markers traceable to exact document chunks |
| **Multi-turn History** | Conversation context injected correctly without token bloat |
| **Streaming Responses** | Real-time SSE token streaming with Groq |
| **User RAG Settings** | Per-user configurable topK, threshold, model, HyDE toggle |
| **Evaluation Harness** | 65 labeled queries, precision@K metric, category + difficulty breakdowns |
| **Rate Limiting** | 3-tier: global (200/15min), chat (60/15min), upload (20/hr) |
| **GitHub Actions CI** | Lint, build, and eval corpus validation on every push |

---

## Retrieval Evaluation

Evaluated on 65 queries across multiple documents:

| Strategy | Precision@5 |
|---|---|
| Fixed 800-char chunks (baseline) | ~62% |
| **Variable 350–450 token, 12% overlap + HyDE** | **~85%** |

Run the evaluation harness yourself:
```bash
cd backend
node eval/eval_runner.js --topK=5 --strategy=variable
```

Results are saved to `backend/eval/results/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS design system (dark theme) |
| Backend | Node.js + Express (ESM) |
| Database | MongoDB Atlas |
| Vector Search | MongoDB Atlas Vector Search (`$vectorSearch`, HNSW) |
| Embeddings | Google Gemini `text-embedding-004` (768 dimensions) |
| LLM | Groq — Llama 3.3 70B Versatile |
| Tokenizer | `gpt-tokenizer` (cl100k_base) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Gemini API key
- Groq API key

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/docmind.git
cd docmind

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Fill in MONGODB_URI, GEMINI_API_KEY, GROQ_API_KEY, JWT_SECRET
```

### 3. Set Up MongoDB Atlas Vector Search

> **Important:** You must create this index manually in the Atlas UI for production vector search.

1. Open [MongoDB Atlas](https://cloud.mongodb.com) → your cluster → **Atlas Search**
2. Click **Create Search Index** → select **Atlas Vector Search**
3. Choose the `chunks` collection
4. Paste this JSON definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

5. Name it `chunk_vector_index`
6. Set `MONGODB_ATLAS_VECTOR_SEARCH=true` in your `.env`

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
docmind/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app + rate limiting
│   │   ├── config/                 # Gemini, Groq, DB configs
│   │   ├── controllers/            # Auth, Document, Chat
│   │   ├── middleware/             # JWT auth middleware
│   │   ├── models/                 # User, Document, Chunk, ChatHistory
│   │   ├── routes/                 # Auth, Document, Chat routes
│   │   └── services/
│   │       ├── chunkService.js     # Token-aware chunking (gpt-tokenizer)
│   │       ├── vectorService.js    # Atlas $vectorSearch + fallback
│   │       ├── ragService.js       # HyDE + generation + citations
│   │       ├── embeddingService.js # Gemini text-embedding-004
│   │       └── textExtractor.js   # PDF/DOCX/TXT extraction
│   └── eval/
│       ├── queries.json            # 65 labeled test queries
│       ├── eval_runner.js          # Precision@K evaluation
│       └── metrics.js             # Metric computation
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatWindow.tsx      # Chat UI + SSE streaming
│       │   ├── CitationPanel.tsx   # Source citations with similarity
│       │   └── Sidebar.tsx         # Navigation + chat history
│       ├── pages/
│       │   ├── Analytics.tsx       # Stats dashboard
│       │   └── Settings.tsx        # RAG configuration
│       └── context/               # Auth, Document, Chat state
└── .github/
    └── workflows/
        └── ci.yml                  # Lint + build + eval validation
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Login |
| `PUT` | `/api/auth/settings` | Update RAG settings |
| `POST` | `/api/documents/upload` | Upload document |
| `GET` | `/api/documents/stats` | Document analytics |
| `POST` | `/api/documents/:id/reprocess` | Re-chunk + re-embed |
| `POST` | `/api/chat/stream` | SSE streaming RAG query |
| `GET` | `/api/chat/stats` | Chat analytics |
| `GET` | `/api/health` | Health check + feature flags |

---

## License

MIT
