'use client';

import { useState } from 'react';
import IngestForm from '@/components/IngestForm';
import ChatInterface from '@/components/ChatInterface';
import styles from './page.module.css';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'ingest' | 'chat'>('chat');
  const [stats, setStats] = useState({ totalChunks: 0, lastIngestTime: 0 });

  const handleIngestComplete = (chunksCreated: number, timeMs: number) => {
    setStats((prev) => ({
      totalChunks: prev.totalChunks + chunksCreated,
      lastIngestTime: timeMs,
    }));
  };

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h1 className={styles.logoText}>
            Mini<span className="gradient-text">RAG</span>
          </h1>
        </div>
        <p className={styles.tagline}>
          Retrieval Augmented Generation with Citations
        </p>
      </header>

      {/* Stats Bar */}
      {stats.totalChunks > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.totalChunks}</span>
            <span className={styles.statLabel}>Chunks Indexed</span>
          </div>
          {stats.lastIngestTime > 0 && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.lastIngestTime}ms</span>
              <span className={styles.statLabel}>Last Ingest</span>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabContainer}>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ask Questions
          </button>
          <button
            className={`tab ${activeTab === 'ingest' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingest')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Add Knowledge
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        <div className={`${styles.panel} card`}>
          {activeTab === 'chat' ? (
            <ChatInterface />
          ) : (
            <IngestForm onIngestComplete={handleIngestComplete} />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          Powered by <strong>Gemini</strong> + <strong>Supabase</strong> + <strong>Cohere</strong>
        </p>
      </footer>
    </main>
  );
}
