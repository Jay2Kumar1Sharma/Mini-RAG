import { NextRequest, NextResponse } from 'next/server';
import { chunkText } from '@/lib/chunker';
import { embedTexts } from '@/lib/embeddings';
import { upsertDocuments } from '@/lib/supabase';

export interface IngestRequest {
    text: string;
    source?: string;
    title?: string;
}

export interface IngestResponse {
    success: boolean;
    chunksCreated: number;
    timeMs: number;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
    const startTime = Date.now();

    try {
        const body: IngestRequest = await request.json();

        if (!body.text || body.text.trim().length === 0) {
            return NextResponse.json(
                { success: false, chunksCreated: 0, timeMs: 0, error: 'Text is required' },
                { status: 400 }
            );
        }

        const source = body.source || `doc-${Date.now()}`;
        const title = body.title || 'Untitled Document';

        // Chunk the text
        const chunks = chunkText(body.text, source, title);

        if (chunks.length === 0) {
            return NextResponse.json({
                success: true,
                chunksCreated: 0,
                timeMs: Date.now() - startTime,
            });
        }

        // Generate embeddings
        const embeddings = await embedTexts(chunks.map((c) => c.text));

        // Store in Supabase
        await upsertDocuments(chunks, embeddings);

        return NextResponse.json({
            success: true,
            chunksCreated: chunks.length,
            timeMs: Date.now() - startTime,
        });
    } catch (error) {
        console.error('Ingest error:', error);
        return NextResponse.json(
            {
                success: false,
                chunksCreated: 0,
                timeMs: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
