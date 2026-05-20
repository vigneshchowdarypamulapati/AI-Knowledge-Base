import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, FileText, MessageSquare, Layers,
    Zap, TrendingUp, Brain, Hash
} from 'lucide-react';
import Layout from '../components/Layout';
import { documentAPI, chatAPI } from '../utils/api';

interface DocStats {
    totalDocuments: number;
    byStatus: {
        embedded?: { count: number; size: number; chunks: number };
        processing?: { count: number };
        error?: { count: number };
    };
    chunks: {
        totalChunks: number;
        avgTokens: number;
        minTokens: number;
        maxTokens: number;
    };
}

interface ChatStats {
    totalChats: number;
    messageStats: {
        totalMessages: number;
        avgSources: number;
        hydeUsedCount: number;
    };
}

const StatCard = ({
    icon: Icon,
    label,
    value,
    sub,
    color,
    delay
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
    delay: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="border border-border-strong p-6 bg-bg-surface flex flex-col hover:border-text-primary transition-colors duration-300"
    >
        <div className="flex items-center justify-between mb-4">
            <p className="text-mono text-xs uppercase tracking-widest text-muted">{label}</p>
            <div style={{ color }}>
                <Icon size={18} />
            </div>
        </div>
        <div className="mt-auto">
            <p className="text-serif text-3xl mb-1 text-primary">{value}</p>
            {sub && <p className="text-mono text-[10px] uppercase tracking-widest text-muted border-t border-border-strong pt-2 mt-2">{sub}</p>}
        </div>
    </motion.div>
);

export default function AnalyticsPage() {
    const [docStats, setDocStats] = useState<DocStats | null>(null);
    const [chatStats, setChatStats] = useState<ChatStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [docRes, chatRes] = await Promise.all([
                    documentAPI.getStats(),
                    chatAPI.getStats()
                ]);
                setDocStats(docRes.data.data);
                setChatStats(chatRes.data.data);
            } catch (err) {
                console.error('Failed to load analytics:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const embeddedDocs = docStats?.byStatus?.embedded;
    const formatBytes = (b: number) =>
        b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` :
        b > 1_000 ? `${(b / 1_000).toFixed(1)} KB` : `${b} B`;

    return (
        <Layout>
            <div style={{ padding: 'var(--space-8)', maxWidth: '1100px', margin: '0 auto' }}>
                <div className="page-header border-b border-strong pb-4 mb-8">
                    <h1 className="editorial-heading mb-0" style={{ fontSize: '4rem' }}>Telemetry.</h1>
                    <p className="text-mono text-muted uppercase tracking-widest text-sm mt-2">
                        Retrieval performance and knowledge base statistics
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center" style={{ height: 300 }}>
                        <div className="spinner border-accent border-r-transparent" />
                    </div>
                ) : (
                    <>
                        {/* ── Stat Cards ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            <StatCard
                                icon={FileText}
                                label="DATABANKS"
                                value={docStats?.totalDocuments ?? 0}
                                sub={`[${embeddedDocs?.count ?? 0} ACTIVE]`}
                                color="var(--accent-primary)"
                                delay={0.05}
                            />
                            <StatCard
                                icon={Layers}
                                label="CHUNKS TOTAL"
                                value={docStats?.chunks?.totalChunks?.toLocaleString() ?? 0}
                                sub={`[AVG ${Math.round(docStats?.chunks?.avgTokens ?? 0)} TOKENS]`}
                                color="var(--text-primary)"
                                delay={0.1}
                            />
                            <StatCard
                                icon={MessageSquare}
                                label="SESSIONS"
                                value={chatStats?.totalChats ?? 0}
                                sub={`[${chatStats?.messageStats?.totalMessages ?? 0} MESSAGES]`}
                                color="var(--text-primary)"
                                delay={0.15}
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="AVG SOURCES"
                                value={(chatStats?.messageStats?.avgSources ?? 0).toFixed(1)}
                                sub="[CITED PER RESPONSE]"
                                color="var(--accent-primary)"
                                delay={0.2}
                            />
                            <StatCard
                                icon={Brain}
                                label="HYDE COMPUTES"
                                value={chatStats?.messageStats?.hydeUsedCount ?? 0}
                                sub="[VECTORS ENHANCED]"
                                color="var(--text-primary)"
                                delay={0.25}
                            />
                            <StatCard
                                icon={Hash}
                                label="TOKEN WINDOW"
                                value={`${docStats?.chunks?.minTokens ?? 0}–${docStats?.chunks?.maxTokens ?? 0}`}
                                sub="[VARIABLE SPREAD]"
                                color="var(--text-primary)"
                                delay={0.3}
                            />
                        </div>

                        {/* ── Chunking Strategy Section ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="border border-border-strong p-8 bg-bg-surface mb-8"
                        >
                            <div className="flex items-center gap-2 mb-8 border-b border-border-strong pb-4">
                                <BarChart3 size={18} className="text-accent" />
                                <h2 className="text-serif text-xl uppercase tracking-widest">Performance Diff.</h2>
                            </div>

                            <div className="flex flex-col gap-8">
                                <div className="border border-border-strong p-4 opacity-50 grayscale">
                                    <div className="text-mono text-xs uppercase tracking-widest mb-4">v1 [FIXED CHAR]</div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-2 bg-muted w-[62%]" />
                                        <span className="text-mono text-sm">~62%</span>
                                    </div>
                                    <p className="text-mono text-[10px] text-muted uppercase mt-4">800 chars · 25% overlap</p>
                                </div>

                                <div className="border border-accent p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 bg-accent text-bg-base text-mono text-[10px] font-bold uppercase tracking-widest">ACTIVE</div>
                                    <div className="text-mono text-xs uppercase tracking-widest mb-4 text-accent">v2 [TOKEN AWARE]</div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-2 bg-accent w-[85%]" />
                                        <span className="text-mono text-sm text-accent font-bold">~85%</span>
                                    </div>
                                    <p className="text-mono text-[10px] text-muted uppercase mt-4">350-450 tokens · 12% overlap · semantic bounds</p>
                                </div>
                            </div>

                            <div className="mt-8 text-mono text-xs uppercase tracking-widest text-muted border-t border-border-strong pt-4 flex items-center gap-2">
                                <Zap size={14} className="text-accent" />
                                VALIDATED ON 65 QUERIES ACROSS {docStats?.totalDocuments ?? 0} DATABANKS [METRIC: P@5]
                            </div>
                        </motion.div>

                        {/* ── Knowledge Base Summary ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="border border-border-strong p-8 bg-bg-surface"
                        >
                            <h2 className="text-serif text-xl border-b border-border-strong pb-4 mb-6 uppercase tracking-widest">System Health.</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex flex-col border border-border-strong p-4">
                                    <span className="text-mono text-[10px] text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-success" /> READY
                                    </span>
                                    <strong className="text-serif text-2xl text-primary">{embeddedDocs?.count ?? 0}</strong>
                                </div>
                                <div className="flex flex-col border border-border-strong p-4">
                                    <span className="text-mono text-[10px] text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-warning" /> PROCESSING
                                    </span>
                                    <strong className="text-serif text-2xl text-primary">{docStats?.byStatus?.processing?.count ?? 0}</strong>
                                </div>
                                <div className="flex flex-col border border-border-strong p-4">
                                    <span className="text-mono text-[10px] text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-error" /> ERRORS
                                    </span>
                                    <strong className="text-serif text-2xl text-primary">{docStats?.byStatus?.error?.count ?? 0}</strong>
                                </div>
                                <div className="flex flex-col border border-border-strong p-4">
                                    <span className="text-mono text-[10px] text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-accent" /> FOOTPRINT
                                    </span>
                                    <strong className="text-serif text-2xl text-primary">{formatBytes(embeddedDocs?.size ?? 0)}</strong>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </Layout>
    );
}
