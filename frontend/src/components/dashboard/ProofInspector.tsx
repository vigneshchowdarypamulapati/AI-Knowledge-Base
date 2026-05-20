"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Zap } from "lucide-react";

export interface Citation {
    documentId: string;
    documentName: string;
    chunkText: string;
    similarity: number;
}

interface ProofInspectorProps {
    citation: Citation | null;
    query?: string;
    onClose: () => void;
}

export default function ProofInspector({ citation, query, onClose }: ProofInspectorProps) {
    const highlightText = (text: string, queryStr?: string) => {
        if (!queryStr || !queryStr.trim()) return text;
        
        // Extract words, filter out very short stop-words
        const words = queryStr
            .split(/\s+/)
            .map(w => w.replace(/[^a-zA-Z0-9]/g, ""))
            .filter(w => w.length > 2);
            
        if (words.length === 0) return text;

        // Construct a safe regex matching any of the query words
        try {
            const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
            const regex = new RegExp(`\\b(${escapedWords.join("|")})\\b`, "gi");
            const parts = text.split(regex);
            
            return parts.map((part, i) => {
                const isMatch = words.some(w => w.toLowerCase() === part.toLowerCase());
                return isMatch ? (
                    <mark key={i} className="bg-white/20 text-white font-semibold rounded px-0.5">
                        {part}
                    </mark>
                ) : (
                    part
                );
            });
        } catch (e) {
            return text;
        }
    };

    return (
        <AnimatePresence>
            {citation && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="border-l border-white/10 bg-obsidian-light shrink-0 overflow-hidden relative z-30"
                >
                    <div className="w-[400px] flex flex-col h-full absolute right-0 top-0">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-obsidian/50 backdrop-blur-md">
                            <div>
                                <h3 className="font-serif text-lg text-white">Proof Inspector</h3>
                                <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest mt-1">Source Verification</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                    <ExternalLink size={14} />
                                    <span className="font-mono text-xs uppercase">{citation.documentName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1 bg-white/5 border border-white/10 rounded-lg p-3 w-full">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider">Semantic Match Strength</span>
                                            <span className="font-mono text-[10px] font-bold text-white">
                                                {(citation.similarity * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(citation.similarity * 100, 100)}%` }}
                                                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                                                className="bg-white h-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative mt-8">
                                <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-white/20" />
                                <div className="absolute -left-[15px] top-4 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
                                <div className="p-5 bg-white/[0.02] backdrop-blur-sm rounded-r-lg border border-white/10 border-l-0 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />
                                    <p className="font-serif text-sm leading-loose text-neutral-300 italic">
                                        "{highlightText(citation.chunkText, query)}"
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center justify-between px-1">
                                    <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest">
                                        {citation.chunkText.length} Characters
                                    </span>
                                    <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest">
                                        Vector Index Block
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
