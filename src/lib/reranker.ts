import { CohereClient } from 'cohere-ai';
import { SearchResult } from './supabase';

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || '',
});

export interface RerankResult {
    document: SearchResult;
    relevanceScore: number;
}

/**
 * Rerank search results using Cohere's rerank model
 */
export async function rerankDocuments(
    query: string,
    documents: SearchResult[],
    topN: number = 5
): Promise<RerankResult[]> {
    if (documents.length === 0) {
        return [];
    }

    const response = await cohere.rerank({
        query,
        documents: documents.map((doc) => doc.content),
        topN,
        model: 'rerank-english-v3.0',
    });

    return response.results.map((result) => ({
        document: documents[result.index],
        relevanceScore: result.relevanceScore,
    }));
}
