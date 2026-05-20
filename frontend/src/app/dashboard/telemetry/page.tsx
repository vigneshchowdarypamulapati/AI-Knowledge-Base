"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, FileText, MessageSquare, Layers, TrendingUp, Brain, Hash, Activity } from "lucide-react";
import { documentAPI, chatAPI } from "@/utils/api";

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

interface StatCardProps {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: string | number;
    sub?: string;
    delay: number;
}

const StatCard = ({ icon: Icon, label, value, sub, delay }: StatCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-panel p-6 flex flex-col group"
    >
        <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{label}</p>
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-neutral-400 group-hover:bg-white group-hover:text-black transition-all">
                <Icon size={14} />
            </div>
        </div>
        <div className="mt-auto">
            <p className="font-serif text-3xl text-white mb-2">{value}</p>
            {sub && <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 border-t border-white/10 pt-3">{sub}</p>}
        </div>
    </motion.div>
);

export default function TelemetryPage() {
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
                console.error("Failed to load telemetry:", err);
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
        <div className="flex-1 overflow-y-auto hide-scrollbar p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-12 border-b border-white/10 pb-6 flex items-center gap-4">
                    <Activity className="text-white" size={24} />
                    <div>
                        <h1 className="font-serif text-3xl text-white">Telemetry</h1>
                        <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-2">
                            Retrieval performance and knowledge base statistics
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            <StatCard
                                icon={FileText} label="Databanks"
                                value={docStats?.totalDocuments ?? 0}
                                sub={`[${embeddedDocs?.count ?? 0} Active / ${embeddedDocs?.size ? formatBytes(embeddedDocs.size) : '0 B'}]`} delay={0.05}
                            />
                            <StatCard
                                icon={Layers} label="Chunks Total"
                                value={docStats?.chunks?.totalChunks?.toLocaleString() ?? 0}
                                sub={`[Avg ${Math.round(docStats?.chunks?.avgTokens ?? 0)} Tokens]`} delay={0.1}
                            />
                            <StatCard
                                icon={MessageSquare} label="Sessions"
                                value={chatStats?.totalChats ?? 0}
                                sub={`[${chatStats?.messageStats?.totalMessages ?? 0} Messages]`} delay={0.15}
                            />
                            <StatCard
                                icon={TrendingUp} label="Avg Sources"
                                value={(chatStats?.messageStats?.avgSources ?? 0).toFixed(1)}
                                sub="[Cited Per Response]" delay={0.2}
                            />
                            <StatCard
                                icon={Brain} label="HyDE Computes"
                                value={chatStats?.messageStats?.hydeUsedCount ?? 0}
                                sub="[Vectors Enhanced]" delay={0.25}
                            />
                            <StatCard
                                icon={Hash} label="Token Window"
                                value={`${docStats?.chunks?.minTokens ?? 0}–${docStats?.chunks?.maxTokens ?? 0}`}
                                sub="[Variable Spread]" delay={0.3}
                            />
                        </div>

                        {/* Chunking Strategy Diff */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="glass-panel p-8 mb-8"
                        >
                            <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4">
                                <BarChart3 size={16} className="text-white" />
                                <h2 className="font-serif text-lg text-white">Performance Diff</h2>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="border border-white/5 p-4 opacity-50 bg-white/[0.01]">
                                    <div className="font-mono text-[10px] uppercase tracking-widest mb-4 text-neutral-500">v1 [Fixed Char]</div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-1 bg-neutral-600 w-[62%]" />
                                        <span className="font-mono text-xs">~62%</span>
                                    </div>
                                    <p className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest mt-4">800 chars · 25% overlap</p>
                                </div>

                                <div className="border border-white/20 p-6 relative bg-white/5">
                                    <div className="absolute top-0 right-0 px-2 py-1 bg-white text-black font-mono text-[9px] uppercase tracking-widest">Active Model</div>
                                    <div className="font-mono text-[10px] uppercase tracking-widest mb-4 text-white">v2 [Token Aware]</div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] w-[85%]" />
                                        <span className="font-mono text-xs text-white">~85%</span>
                                    </div>
                                    <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest mt-4">350-450 tokens · 12% overlap · Semantic bounds</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}
