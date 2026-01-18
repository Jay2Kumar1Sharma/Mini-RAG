'use client';

import { useState, useRef } from 'react';
import styles from './IngestForm.module.css';

interface IngestFormProps {
    onIngestComplete?: (chunksCreated: number, timeMs: number) => void;
}

export default function IngestForm({ onIngestComplete }: IngestFormProps) {
    const [text, setText] = useState('');
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();

        try {
            // Handle PDF files
            if (fileName.endsWith('.pdf')) {
                setIsParsing(true);
                setStatus({ type: 'info', message: `Parsing PDF "${file.name}"...` });

                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/parse-pdf', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (data.success) {
                    setText(data.text);
                    if (!title) {
                        setTitle(file.name.replace(/\.pdf$/i, ''));
                    }
                    setStatus({
                        type: 'success',
                        message: `PDF "${file.name}" loaded (${data.numPages} pages)`
                    });
                } else {
                    setStatus({ type: 'error', message: data.error || 'Failed to parse PDF' });
                }
                setIsParsing(false);
            } else {
                // Handle text files
                const content = await file.text();
                setText(content);
                if (!title) {
                    setTitle(file.name.replace(/\.[^/.]+$/, ''));
                }
                setStatus({ type: 'success', message: `File "${file.name}" loaded` });
            }
        } catch {
            setStatus({ type: 'error', message: 'Failed to read file' });
            setIsParsing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            setStatus({ type: 'error', message: 'Please enter some text' });
            return;
        }

        setIsLoading(true);
        setStatus(null);

        try {
            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    title: title || 'Untitled Document',
                    source: `doc-${Date.now()}`,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setStatus({
                    type: 'success',
                    message: `Successfully ingested ${data.chunksCreated} chunks in ${data.timeMs}ms`,
                });
                setText('');
                setTitle('');
                onIngestComplete?.(data.chunksCreated, data.timeMs);
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to ingest' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const isDisabled = isLoading || isParsing;

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <span className="gradient-text">Add Knowledge</span>
                </h2>
                <p className={styles.subtitle}>
                    Paste text or upload a file to add to your knowledge base
                </p>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="title" className={styles.label}>
                    Document Title (optional)
                </label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for reference"
                    className="input"
                    disabled={isDisabled}
                />
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="text" className={styles.label}>
                    Content
                </label>
                <textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your text here..."
                    className="textarea"
                    rows={8}
                    disabled={isDisabled}
                />
            </div>

            <div className={styles.actions}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.csv,.json,.pdf"
                    className={styles.fileInput}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    disabled={isDisabled}
                >
                    {isParsing ? (
                        <>
                            <span className="spinner" />
                            Parsing PDF...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17,8 12,3 7,8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload File
                        </>
                    )}
                </button>

                <button type="submit" className="btn btn-primary" disabled={isDisabled || !text.trim()}>
                    {isLoading ? (
                        <>
                            <span className="spinner" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add to Knowledge Base
                        </>
                    )}
                </button>
            </div>

            {status && (
                <div className={`${styles.status} ${status.type === 'success' ? styles.success : status.type === 'error' ? styles.error : styles.infoStatus} fade-in`}>
                    {status.type === 'success' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    ) : status.type === 'info' ? (
                        <span className="spinner" />
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    )}
                    {status.message}
                </div>
            )}

            <div className={styles.info}>
                <p>
                    <strong>Supported formats:</strong> .txt, .md, .csv, .json, .pdf
                </p>
                <p>
                    <strong>Chunking:</strong> ~1000 characters per chunk with 15% overlap
                </p>
            </div>
        </form>
    );
}
