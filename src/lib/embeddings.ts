import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini text-embedding-004 outputs 768 dimensions
export const EMBEDDING_DIMENSION = 768;

let genAIInstance: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAIInstance) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not set in environment variables');
        }
        genAIInstance = new GoogleGenerativeAI(apiKey);
    }
    return genAIInstance;
}

/**
 * Generate embeddings for a single text using Gemini text-embedding-004
 */
export async function embedText(text: string): Promise<number[]> {
    const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });

    // Process in batches to avoid rate limits
    const batchSize = 10;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (text) => {
                const result = await model.embedContent(text);
                return result.embedding.values;
            })
        );
        embeddings.push(...results);
    }

    return embeddings;
}
