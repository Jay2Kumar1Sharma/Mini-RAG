import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/lib/embeddings';
import { searchDocuments } from '@/lib/supabase';
import { rerankDocuments } from '@/lib/reranker';
import { generateAnswer } from '@/lib/generator';

export interface ChatRequest {
    query: string;
    topK?: number;
    topN?: number;
}

export interface Source {
    index: number;
    content: string;
    title: string;
    source: string;
    relevanceScore: number;
}

export interface ChatResponse {
    success: boolean;
    answer: string;
    citations: {
        index: number;
        source: string;
        title: string;
        snippet: string;
    }[];
    sources: Source[];  // All sources used for the answer
    metrics: {
        retrievedCount: number;
        rerankedCount: number;
        tokensUsed: number;
        retrieveTimeMs: number;
        rerankTimeMs: number;
        generateTimeMs: number;
        totalTimeMs: number;
        estimatedCost: number;
        modelUsed?: string;
    };
    noAnswer: boolean;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
    const totalStartTime = Date.now();

    try {
        const body: ChatRequest = await request.json();

        if (!body.query || body.query.trim().length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    answer: '',
                    citations: [],
                    sources: [],
                    metrics: {
                        retrievedCount: 0,
                        rerankedCount: 0,
                        tokensUsed: 0,
                        retrieveTimeMs: 0,
                        rerankTimeMs: 0,
                        generateTimeMs: 0,
                        totalTimeMs: 0,
                        estimatedCost: 0,
                    },
                    noAnswer: true,
                    error: 'Query is required',
                },
                { status: 400 }
            );
        }

        const topK = body.topK || 20;
        const topN = body.topN || 5;

        // Step 1: Embed the query
        const retrieveStartTime = Date.now();
        const queryEmbedding = await embedText(body.query);

        // Step 2: Retrieve from Supabase
        const searchResults = await searchDocuments(queryEmbedding, topK);
        const retrieveTimeMs = Date.now() - retrieveStartTime;

        // Step 3: Rerank
        const rerankStartTime = Date.now();
        const rerankedResults = await rerankDocuments(body.query, searchResults, topN);
        const rerankTimeMs = Date.now() - rerankStartTime;

        // Step 4: Generate answer
        const generateStartTime = Date.now();
        const generationResult = await generateAnswer(body.query, rerankedResults);
        const generateTimeMs = Date.now() - generateStartTime;

        const totalTimeMs = Date.now() - totalStartTime;

        // Build sources array from reranked results
        const sources: Source[] = rerankedResults.map((result, index) => ({
            index: index + 1,
            content: result.document.content,
            title: result.document.metadata.title,
            source: result.document.metadata.source,
            relevanceScore: result.relevanceScore,
        }));

        // Estimate cost (very rough - Gemini free tier, Cohere free tier)
        const estimatedCost = 0; // Free tier

        return NextResponse.json({
            success: true,
            answer: generationResult.answer,
            citations: generationResult.citations,
            sources,
            metrics: {
                retrievedCount: searchResults.length,
                rerankedCount: rerankedResults.length,
                tokensUsed: generationResult.tokensUsed,
                retrieveTimeMs,
                rerankTimeMs,
                generateTimeMs,
                totalTimeMs,
                estimatedCost,
                modelUsed: generationResult.modelUsed,
            },
            noAnswer: generationResult.noAnswer,
        });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            {
                success: false,
                answer: '',
                citations: [],
                sources: [],
                metrics: {
                    retrievedCount: 0,
                    rerankedCount: 0,
                    tokensUsed: 0,
                    retrieveTimeMs: 0,
                    rerankTimeMs: 0,
                    generateTimeMs: 0,
                    totalTimeMs: Date.now() - totalStartTime,
                    estimatedCost: 0,
                },
                noAnswer: true,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
