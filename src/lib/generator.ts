import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { RerankResult } from './reranker';

let genAIInstance: GoogleGenerativeAI | null = null;

// Model fallback order - will try each in sequence if previous fails
const MODEL_FALLBACK_ORDER = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemma-3-27b-it',
];

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

export interface GenerationResult {
    answer: string;
    citations: {
        index: number;
        source: string;
        title: string;
        snippet: string;
    }[];
    tokensUsed: number;
    noAnswer: boolean;
    modelUsed?: string;
}

/**
 * Try to generate content with a specific model
 */
async function tryGenerateWithModel(
    model: GenerativeModel,
    prompt: string
): Promise<string> {
    const result = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }],
            },
        ],
        generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.3,
        },
    });
    return result.response.text();
}

/**
 * Generate an answer with citations using Gemini with model fallback
 */
export async function generateAnswer(
    query: string,
    context: RerankResult[]
): Promise<GenerationResult> {
    if (context.length === 0) {
        return {
            answer: "I couldn't find any relevant information to answer your question.",
            citations: [],
            tokensUsed: 0,
            noAnswer: true,
        };
    }

    // Build context string with citation markers
    const contextParts = context.map((result, i) => {
        return `[${i + 1}] ${result.document.content}`;
    });

    const systemPrompt = `You are a helpful assistant that answers questions based on the provided context. 
You must:
1. Only use information from the provided context to answer.
2. Include inline citations like [1], [2], etc. that reference the context snippets.
3. If the context doesn't contain enough information to answer the question, say so clearly.
4. Be concise but comprehensive.

Context:
${contextParts.join('\n\n')}`;

    const fullPrompt = systemPrompt + '\n\nQuestion: ' + query;

    // Try each model in fallback order
    let answer = '';
    let modelUsed = '';
    let lastError: Error | null = null;

    for (const modelName of MODEL_FALLBACK_ORDER) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = getGenAI().getGenerativeModel({ model: modelName });
            answer = await tryGenerateWithModel(model, fullPrompt);
            modelUsed = modelName;
            console.log(`Success with model: ${modelName}`);
            break;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`Model ${modelName} failed: ${lastError.message}`);

            // If it's not a rate limit or model not found error, throw immediately
            const errorMessage = lastError.message.toLowerCase();
            if (!errorMessage.includes('429') &&
                !errorMessage.includes('quota') &&
                !errorMessage.includes('not found') &&
                !errorMessage.includes('not supported')) {
                throw lastError;
            }
            // Otherwise continue to next model
        }
    }

    if (!answer && lastError) {
        throw new Error(`All models failed. Last error: ${lastError.message}`);
    }

    // Extract which citations were used
    const usedCitations: number[] = [];
    const citationRegex = /\[(\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
        const citationNum = parseInt(match[1], 10);
        if (citationNum <= context.length && !usedCitations.includes(citationNum)) {
            usedCitations.push(citationNum);
        }
    }

    // Build citations array
    const citations = usedCitations.sort((a, b) => a - b).map((num) => {
        const ctx = context[num - 1];
        return {
            index: num,
            source: ctx.document.metadata.source,
            title: ctx.document.metadata.title,
            snippet: ctx.document.content.slice(0, 200) + (ctx.document.content.length > 200 ? '...' : ''),
        };
    });

    // Estimate tokens (rough approximation)
    const tokensUsed = Math.ceil((systemPrompt.length + query.length + answer.length) / 4);

    // Check if it's a no-answer response
    const noAnswer = answer.toLowerCase().includes("don't have enough information") ||
        answer.toLowerCase().includes("cannot answer") ||
        answer.toLowerCase().includes("no information");

    return {
        answer,
        citations,
        tokensUsed,
        noAnswer,
        modelUsed,
    };
}
