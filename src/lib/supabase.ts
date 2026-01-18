import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Chunk } from './chunker';
import { EMBEDDING_DIMENSION } from './embeddings';

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase URL and Service Role Key are required. Check your environment variables.');
        }

        supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
    }
    return supabaseInstance;
}

export interface DocumentRecord {
    id?: string;
    content: string;
    embedding: number[];
    metadata: {
        source: string;
        title: string;
        start_index: number;
        end_index: number;
        chunk_index: number;
    };
    created_at?: string;
}

/**
 * Insert documents with embeddings into Supabase
 */
export async function upsertDocuments(
    chunks: Chunk[],
    embeddings: number[][]
): Promise<void> {
    const documents: DocumentRecord[] = chunks.map((chunk, i) => ({
        id: chunk.id,
        content: chunk.text,
        embedding: embeddings[i],
        metadata: chunk.metadata,
    }));

    const { error } = await getSupabase().from('documents').upsert(documents, {
        onConflict: 'id',
    });

    if (error) {
        throw new Error(`Failed to upsert documents: ${error.message}`);
    }
}

export interface SearchResult {
    id: string;
    content: string;
    metadata: {
        source: string;
        title: string;
        start_index: number;
        end_index: number;
        chunk_index: number;
    };
    similarity: number;
}

/**
 * Search for similar documents using vector similarity (requires RPC function in Supabase)
 */
export async function searchDocuments(
    queryEmbedding: number[],
    topK: number = 20
): Promise<SearchResult[]> {
    const { data, error } = await getSupabase().rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_count: topK,
    });

    if (error) {
        throw new Error(`Failed to search documents: ${error.message}`);
    }

    return data || [];
}

/**
 * SQL to create the documents table and search function in Supabase:
 * 
 * -- Enable pgvector extension
 * CREATE EXTENSION IF NOT EXISTS vector;
 * 
 * -- Create documents table
 * CREATE TABLE documents (
 *   id TEXT PRIMARY KEY,
 *   content TEXT NOT NULL,
 *   embedding VECTOR(768),
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Create index for faster similarity search
 * CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 * 
 * -- Create search function
 * CREATE OR REPLACE FUNCTION match_documents(
 *   query_embedding VECTOR(768),
 *   match_count INT DEFAULT 10
 * )
 * RETURNS TABLE (
 *   id TEXT,
 *   content TEXT,
 *   metadata JSONB,
 *   similarity FLOAT
 * )
 * LANGUAGE plpgsql
 * AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT
 *     documents.id,
 *     documents.content,
 *     documents.metadata,
 *     1 - (documents.embedding <=> query_embedding) AS similarity
 *   FROM documents
 *   ORDER BY documents.embedding <=> query_embedding
 *   LIMIT match_count;
 * END;
 * $$;
 */
export const SUPABASE_SETUP_SQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(${EMBEDDING_DIMENSION}),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create or replace search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(${EMBEDDING_DIMENSION}),
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
`;
