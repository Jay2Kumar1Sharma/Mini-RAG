export interface Chunk {
    id: string;
    text: string;
    metadata: {
        source: string;
        title: string;
        start_index: number;
        end_index: number;
        chunk_index: number;
    };
}

export interface ChunkingOptions {
    chunkSize?: number; // Target size in characters (approx 800-1200 tokens)
    chunkOverlap?: number; // Overlap in characters (10-15% of chunkSize)
}

const DEFAULT_CHUNK_SIZE = 1000; // ~250-300 tokens
const DEFAULT_CHUNK_OVERLAP = 150; // ~15% overlap

/**
 * Simple recursive text splitter that chunks text by paragraphs, then sentences.
 */
export function chunkText(
    text: string,
    source: string,
    title: string,
    options: ChunkingOptions = {}
): Chunk[] {
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

    const chunks: Chunk[] = [];
    let currentIndex = 0;
    let chunkIndex = 0;

    // Normalize whitespace
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

    if (normalizedText.length <= chunkSize) {
        // Text is small enough to be a single chunk
        return [
            {
                id: `${source}-${chunkIndex}`,
                text: normalizedText,
                metadata: {
                    source,
                    title,
                    start_index: 0,
                    end_index: normalizedText.length,
                    chunk_index: 0,
                },
            },
        ];
    }

    while (currentIndex < normalizedText.length) {
        let endIndex = Math.min(currentIndex + chunkSize, normalizedText.length);

        // Try to break at a sentence boundary
        if (endIndex < normalizedText.length) {
            const searchWindow = normalizedText.slice(
                Math.max(endIndex - 100, currentIndex),
                endIndex
            );
            const lastPeriod = searchWindow.lastIndexOf('. ');
            const lastQuestion = searchWindow.lastIndexOf('? ');
            const lastExclaim = searchWindow.lastIndexOf('! ');
            const lastNewline = searchWindow.lastIndexOf('\n');

            const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim, lastNewline);

            if (breakPoint > 0) {
                endIndex = Math.max(endIndex - 100, currentIndex) + breakPoint + 2;
            }
        }

        const chunkText = normalizedText.slice(currentIndex, endIndex).trim();

        if (chunkText.length > 0) {
            chunks.push({
                id: `${source}-${chunkIndex}`,
                text: chunkText,
                metadata: {
                    source,
                    title,
                    start_index: currentIndex,
                    end_index: endIndex,
                    chunk_index: chunkIndex,
                },
            });
            chunkIndex++;
        }

        // Move forward, accounting for overlap
        currentIndex = endIndex - chunkOverlap;
        if (currentIndex >= normalizedText.length - chunkOverlap) {
            break;
        }
    }

    return chunks;
}
