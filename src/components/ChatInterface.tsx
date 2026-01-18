'use client';

import { useState } from 'react';
import styles from './ChatInterface.module.css';

interface Citation {
    index: number;
    source: string;
    title: string;
    snippet: string;
}

interface Metrics {
    retrievedCount: number;
    rerankedCount: number;
    tokensUsed: number;
    retrieveTimeMs: number;
    rerankTimeMs: number;
    generateTimeMs: number;
    totalTimeMs: number;
    estimatedCost: number;
}

interface ChatResponse {
    answer: string;
    citations: Citation[];
    metrics: Metrics;
    noAnswer: boolean;
}

export default function ChatInterface() {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<ChatResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            const data = await res.json();

            if (data.success) {
                setResponse(data);
            } else {
                setError(data.error || 'Failed to get response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    const formatAnswer = (answer: string) => {
        // Replace citation markers with styled badges
        return answer.replace(/\[(\d+)\]/g, '<span class="citation-badge">$1</span>');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <span className="gradient-text">Ask Questions</span>
                </h2>
                <p className={styles.subtitle}>
                    Query your knowledge base and get answers with citations
                </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.queryForm}>
                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask a question about your documents..."
                        className={styles.queryInput}
                        disabled={isLoading}
                    />
                    <button type="submit" className={styles.submitBtn} disabled={isLoading || !query.trim()}>
                        {isLoading ? (
                            <span className="spinner" />
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22,2 15,22 11,13 2,9" />
                            </svg>
                        )}
                    </button>
                </div>
            </form>

            {error && (
                <div className={`${styles.errorBox} fade-in`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {response && (
                <div className={`${styles.response} fade-in`}>
                    {/* Answer Section */}
                    <div className={styles.answerSection}>
                        <h3 className={styles.sectionTitle}>Answer</h3>
                        <div
                            className={`${styles.answer} ${response.noAnswer ? styles.noAnswer : ''}`}
                            dangerouslySetInnerHTML={{ __html: formatAnswer(response.answer) }}
                        />
                    </div>

                    {/* Citations Section */}
                    {response.citations.length > 0 && (
                        <div className={styles.citationsSection}>
                            <h3 className={styles.sectionTitle}>Sources</h3>
                            <div className={styles.citationsList}>
                                {response.citations.map((citation) => (
                                    <div key={citation.index} className={styles.citationCard}>
                                        <div className={styles.citationHeader}>
                                            <span className="citation-badge">{citation.index}</span>
                                            <span className={styles.citationTitle}>{citation.title}</span>
                                        </div>
                                        <p className={styles.citationSnippet}>{citation.snippet}</p>
                                        <span className={styles.citationSource}>{citation.source}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metrics Section */}
                    <div className={styles.metricsSection}>
                        <h3 className={styles.sectionTitle}>Performance</h3>
                        <div className={styles.metricsGrid}>
                            <div className="metric">
                                <span className="metric-label">Total Time</span>
                                <span className="metric-value">{response.metrics.totalTimeMs}ms</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Retrieved</span>
                                <span className="metric-value">{response.metrics.retrievedCount} chunks</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Reranked</span>
                                <span className="metric-value">{response.metrics.rerankedCount} chunks</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">Tokens Used</span>
                                <span className="metric-value">~{response.metrics.tokensUsed}</span>
                            </div>
                        </div>
                        <div className={styles.timingBar}>
                            <div
                                className={styles.timingSegment}
                                style={{
                                    width: `${(response.metrics.retrieveTimeMs / response.metrics.totalTimeMs) * 100}%`,
                                    background: 'var(--accent-secondary)',
                                }}
                                title={`Retrieve: ${response.metrics.retrieveTimeMs}ms`}
                            />
                            <div
                                className={styles.timingSegment}
                                style={{
                                    width: `${(response.metrics.rerankTimeMs / response.metrics.totalTimeMs) * 100}%`,
                                    background: 'var(--warning)',
                                }}
                                title={`Rerank: ${response.metrics.rerankTimeMs}ms`}
                            />
                            <div
                                className={styles.timingSegment}
                                style={{
                                    width: `${(response.metrics.generateTimeMs / response.metrics.totalTimeMs) * 100}%`,
                                    background: 'var(--accent-primary)',
                                }}
                                title={`Generate: ${response.metrics.generateTimeMs}ms`}
                            />
                        </div>
                        <div className={styles.timingLegend}>
                            <span><span className={styles.dot} style={{ background: 'var(--accent-secondary)' }} /> Retrieve</span>
                            <span><span className={styles.dot} style={{ background: 'var(--warning)' }} /> Rerank</span>
                            <span><span className={styles.dot} style={{ background: 'var(--accent-primary)' }} /> Generate</span>
                        </div>
                    </div>
                </div>
            )}

            {!response && !error && !isLoading && (
                <div className={styles.placeholder}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p>Ask a question to get started</p>
                </div>
            )}
        </div>
    );
}
