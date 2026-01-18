# MiniRAG - Retrieval Augmented Generation with Citations

A simple, hosted RAG application that allows users to ingest text documents, query them, and receive answers with inline citations.

![MiniRAG Architecture](./docs/architecture.png)

## 🚀 Features

- **Document Ingestion**: Paste text or upload files to build your knowledge base
- **Semantic Search**: Vector similarity search using Supabase pgvector
- **Reranking**: Cohere reranker for improved relevance
- **Grounded Answers**: LLM responses with inline citations
- **Performance Metrics**: Request timing and token usage display
- **Modern UI**: Dark mode with glassmorphism design

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │   Ingest Form    │    │        Chat Interface            │   │
│  │  (Upload/Paste)  │    │  (Query → Answer + Citations)    │   │
│  └────────┬─────────┘    └────────────────┬─────────────────┘   │
└───────────┼───────────────────────────────┼─────────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                         API Routes                                 │
│  ┌─────────────────┐         ┌──────────────────────────────────┐ │
│  │  /api/ingest    │         │           /api/chat              │ │
│  │                 │         │                                  │ │
│  │ 1. Chunk text   │         │ 1. Embed query (Gemini)          │ │
│  │ 2. Embed chunks │         │ 2. Search vectors (Supabase)     │ │
│  │ 3. Store in DB  │         │ 3. Rerank results (Cohere)       │ │
│  └────────┬────────┘         │ 4. Generate answer (Gemini)      │ │
│           │                  └────────────────────────────────────┘│
└───────────┼──────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                      External Services                             │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────────┐  │
│  │   Gemini    │   │    Supabase     │   │      Cohere         │  │
│  │ (Embeddings │   │   (pgvector)    │   │    (Reranker)       │  │
│  │   & LLM)    │   │                 │   │                     │  │
│  └─────────────┘   └─────────────────┘   └─────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## 📋 Configuration

### Providers Used

| Component   | Provider        | Model/Service                | Free Tier                  |
|-------------|-----------------|------------------------------|----------------------------|
| Embeddings  | Google Gemini   | text-embedding-004 (768 dim) | 15 RPM, 1M tokens/day      |
| LLM         | Google Gemini   | gemini-1.5-flash             | 15 RPM, 1M tokens/day      |
| Vector DB   | Supabase        | pgvector                     | 500MB storage, 2 projects  |
| Reranker    | Cohere          | rerank-english-v3.0          | 1000 calls/month           |

### Chunking Parameters

| Parameter    | Value        | Description                          |
|--------------|--------------|--------------------------------------|
| Chunk Size   | ~1000 chars  | Approximately 250-300 tokens         |
| Overlap      | 150 chars    | ~15% overlap between chunks          |
| Strategy     | Recursive    | Splits at sentence boundaries        |

### Retriever/Reranker Settings

| Parameter         | Value | Description                              |
|-------------------|-------|------------------------------------------|
| Initial Top-K     | 20    | Chunks retrieved from vector search      |
| Reranked Top-N    | 5     | Chunks passed to LLM after reranking     |
| Similarity Metric | Cosine| Vector similarity measurement            |

## 🛠️ Quick Start

### Prerequisites

1. **Google AI Studio API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey)
2. **Supabase Project**: Create at [Supabase](https://supabase.com)
3. **Cohere API Key**: Get from [Cohere Dashboard](https://dashboard.cohere.com/api-keys)

### Supabase Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd mini-rag-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your API keys in .env.local
# GOOGLE_API_KEY=your_key
# NEXT_PUBLIC_SUPABASE_URL=your_url
# SUPABASE_SERVICE_ROLE_KEY=your_key
# COHERE_API_KEY=your_key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Deployment (Vercel)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

## 📊 Evaluation

See [EVALUATION.md](./EVALUATION.md) for the gold standard evaluation with 5 Q/A pairs.

### Quick Test

1. Ingest a document about a topic (e.g., climate change, history, etc.)
2. Ask questions related to the content
3. Verify citations match the source text

## ⚠️ Remarks & Tradeoffs

### Rate Limits
- **Gemini Free Tier**: 15 requests per minute. For production, consider paid tier.
- **Cohere Free Tier**: 1000 rerank calls per month. Monitor usage.
- **Supabase Free Tier**: 500MB storage limit. Clean up old documents if needed.

### Design Tradeoffs
1. **Chunking**: Using character-based chunking (~1000 chars) rather than token-based for simplicity. Token-based would be more accurate but requires tokenizer.
2. **No Persistent Sessions**: Each page load is a fresh session. Chat history is not persisted.
3. **Simple Citation Extraction**: Citations are extracted via regex. More robust NLP could improve accuracy.
4. **No Authentication**: Anyone with the URL can access. Add auth for production.

### Potential Improvements
- Add streaming responses for better UX
- Implement hybrid search (keyword + semantic)
- Add document management (view, delete)
- Support more file formats (PDF, DOCX)
- Add conversation history

## 📁 Project Structure

```
mini-rag-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts      # RAG pipeline endpoint
│   │   │   └── ingest/route.ts    # Document ingestion endpoint
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Main page
│   │   └── page.module.css        # Page styles
│   ├── components/
│   │   ├── ChatInterface.tsx      # Query and answer UI
│   │   ├── ChatInterface.module.css
│   │   ├── IngestForm.tsx         # Document upload UI
│   │   └── IngestForm.module.css
│   └── lib/
│       ├── chunker.ts             # Text chunking logic
│       ├── embeddings.ts          # Gemini embeddings
│       ├── generator.ts           # Gemini LLM generation
│       ├── reranker.ts            # Cohere reranking
│       └── supabase.ts            # Supabase client
├── .env.example                   # Environment template
├── EVALUATION.md                  # Evaluation results
└── README.md                      # This file
```

## 📄 License

MIT
