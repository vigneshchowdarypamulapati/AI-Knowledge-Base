import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FileText, Sparkles, Hash } from 'lucide-react';

export interface Source {
    index: number;
    documentId: string;
    documentName: string;
    chunkText: string;
    similarity: number;
    chunkIndex?: number;
    tokenCount?: number;
}

interface RetrievalStats {
    chunksFound: number;
    hydeUsed: boolean;
    topK: number;
    model: string;
}

interface CitationPanelProps {
    sources: Source[];
    retrievalStats?: RetrievalStats | null;
}

export default function CitationPanel({ sources, retrievalStats }: CitationPanelProps) {
    const [expanded, setExpanded] = useState(false);
    const [expandedSource, setExpandedSource] = useState<number | null>(null);

    if (!sources || sources.length === 0) return null;

    const similarityColor = (score: number) => {
        if (score >= 0.8) return 'var(--success)';
        if (score >= 0.6) return '#f59e0b';
        return 'var(--gray-400)';
    };

    const similarityLabel = (score: number) => {
        if (score >= 0.8) return 'High';
        if (score >= 0.6) return 'Medium';
        return 'Low';
    };

    return (
        <div className="citation-panel">
            {/* Header row — always visible */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="citation-toggle"
                id="citation-toggle-btn"
            >
                <div className="citation-toggle-left">
                    <FileText size={13} />
                    <span className="citation-label">
                        {sources.length} Source{sources.length !== 1 ? 's' : ''} cited
                    </span>
                    {retrievalStats && (
                        <>
                            <span className="citation-dot">·</span>
                            <span className="citation-meta">
                                {retrievalStats.chunksFound} chunks searched
                            </span>
                            {retrievalStats.hydeUsed && (
                                <>
                                    <span className="citation-dot">·</span>
                                    <span className="citation-hyde">
                                        <Sparkles size={10} />
                                        HyDE
                                    </span>
                                </>
                            )}
                        </>
                    )}
                </div>
                <div className="citation-toggle-right">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>

            {/* Source pills — compact always-visible row */}
            <div className="citation-pills">
                {sources.map((src) => (
                    <button
                        key={src.index}
                        onClick={() => {
                            setExpanded(true);
                            setExpandedSource(expandedSource === src.index ? null : src.index);
                        }}
                        className="citation-pill"
                        title={src.documentName}
                        id={`citation-pill-${src.index}`}
                    >
                        <span className="citation-pill-number">[{src.index}]</span>
                        <span className="citation-pill-name">
                            {src.documentName.length > 20
                                ? src.documentName.substring(0, 18) + '…'
                                : src.documentName}
                        </span>
                        <span
                            className="citation-pill-score"
                            style={{ color: similarityColor(src.similarity) }}
                        >
                            {Math.round(src.similarity * 100)}%
                        </span>
                    </button>
                ))}
            </div>

            {/* Expanded source cards */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="citation-cards"
                    >
                        {sources.map((src) => (
                            <motion.div
                                key={src.index}
                                className={`citation-card ${expandedSource === src.index ? 'expanded' : ''}`}
                                id={`citation-card-${src.index}`}
                            >
                                <button
                                    className="citation-card-header"
                                    onClick={() =>
                                        setExpandedSource(expandedSource === src.index ? null : src.index)
                                    }
                                >
                                    <div className="citation-card-left">
                                        <span className="citation-index">[{src.index}]</span>
                                        <FileText size={13} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                                        <span className="citation-doc-name">{src.documentName}</span>
                                    </div>
                                    <div className="citation-card-right">
                                        {src.tokenCount && (
                                            <span className="citation-token-count">
                                                <Hash size={10} />
                                                {src.tokenCount}t
                                            </span>
                                        )}
                                        <span
                                            className="citation-score-badge"
                                            style={{
                                                background: `${similarityColor(src.similarity)}22`,
                                                color: similarityColor(src.similarity),
                                                borderColor: `${similarityColor(src.similarity)}44`
                                            }}
                                        >
                                            {similarityLabel(src.similarity)} · {Math.round(src.similarity * 100)}%
                                        </span>
                                        {expandedSource === src.index
                                            ? <ChevronUp size={13} />
                                            : <ChevronDown size={13} />}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {expandedSource === src.index && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="citation-card-body"
                                        >
                                            <blockquote className="citation-quote">
                                                "{src.chunkText}"
                                            </blockquote>
                                            {src.chunkIndex !== undefined && (
                                                <p className="citation-chunk-meta">
                                                    Chunk #{src.chunkIndex + 1}
                                                    {src.tokenCount ? ` · ${src.tokenCount} tokens` : ''}
                                                </p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}

                        {/* Retrieval stats footer */}
                        {retrievalStats && (
                            <div className="citation-stats-footer">
                                <span>Model: <strong>{retrievalStats.model?.split('-').slice(0, 2).join('-')}</strong></span>
                                <span>·</span>
                                <span>Top-{retrievalStats.topK} retrieval</span>
                                {retrievalStats.hydeUsed && (
                                    <>
                                        <span>·</span>
                                        <span style={{ color: 'var(--primary-400)' }}>
                                            <Sparkles size={10} style={{ display: 'inline', marginRight: 3 }} />
                                            HyDE enhanced
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
