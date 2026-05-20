"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Save, Loader2, Sliders, Brain, Zap, ChevronRight, ToggleLeft, ToggleRight, LayoutTemplate } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/utils/api";
import toast from "react-hot-toast";

type Model = "llama-3.3-70b-versatile" | "llama-3.1-8b-instant" | "mixtral-8x7b-32768";

interface UserSettings {
    topK: number;
    similarityThreshold: number;
    useHyDE: boolean;
    streamingEnabled: boolean;
    model: Model;
}

const MODEL_OPTIONS: { value: Model; label: string; desc: string }[] = [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "Best quality · Recommended" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B", desc: "Fastest · Lower quality" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8×7B", desc: "Large context · Balanced" },
];

export default function SettingsPage() {
    const { user, refreshUser } = useAuth();

    const s = (user?.settings ?? {}) as UserSettings;
    const [name, setName] = useState(user?.name ?? "");
    const [topK, setTopK] = useState<number>(s.topK ?? 5);
    const [threshold, setThreshold] = useState<number>(s.similarityThreshold ?? 0.3);
    const [useHyDE, setUseHyDE] = useState<boolean>(s.useHyDE ?? true);
    const [streaming, setStreaming] = useState<boolean>(s.streamingEnabled ?? true);
    const [model, setModel] = useState<Model>(s.model ?? "llama-3.3-70b-versatile");

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingRAG, setSavingRAG] = useState(false);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            await authAPI.updateProfile({ name });
            await refreshUser?.();
            toast.success("Profile updated", { style: { background: '#0a0a0a', color: '#fff' }});
        } catch {
            toast.error("Failed to update profile");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSaveRAG = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingRAG(true);
        try {
            await authAPI.updateSettings({ topK, similarityThreshold: threshold, useHyDE, streamingEnabled: streaming, model });
            await refreshUser?.();
            toast.success("Pipeline config saved", { style: { background: '#0a0a0a', color: '#fff' }});
        } catch {
            toast.error("Failed to save settings");
        } finally {
            setSavingRAG(false);
        }
    };

    const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
        <button type="button" onClick={() => onChange(!value)} className="focus:outline-none">
            {value
                ? <ToggleRight size={28} className="text-white" />
                : <ToggleLeft size={28} className="text-neutral-600" />
            }
        </button>
    );

    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-12 border-b border-white/10 pb-6 flex items-center gap-4">
                    <LayoutTemplate className="text-white" size={24} />
                    <div>
                        <h1 className="font-serif text-3xl text-white">Configuration</h1>
                        <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-2">
                            Modify identity parameters and retrieval pipeline
                        </p>
                    </div>
                </div>

                {/* Profile */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 mb-8"
                >
                    <h2 className="font-serif text-lg text-white mb-6 flex items-center gap-2">
                        <User size={16} className="text-neutral-400" /> Identity.Params
                    </h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div>
                            <label className="block font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Protocol Identifier</label>
                            <input
                                type="email"
                                value={user?.email ?? ""}
                                disabled
                                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-neutral-400 font-mono text-sm opacity-50 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Designation Alias</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-white/30 transition-colors"
                                required
                            />
                        </div>
                        <button type="submit" disabled={savingProfile} className="bg-white text-black font-mono text-xs uppercase tracking-widest px-6 py-3 flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50">
                            {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Execute Identity Update
                        </button>
                    </form>
                </motion.div>

                {/* RAG Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-8 mb-8"
                >
                    <h2 className="font-serif text-lg text-white mb-6 flex items-center gap-2">
                        <Brain size={16} className="text-neutral-400" /> Pipeline.Config
                    </h2>
                    <form onSubmit={handleSaveRAG} className="space-y-8">
                        <div>
                            <label className="flex justify-between font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
                                <span>Retrieval Density (Top-K)</span>
                                <span className="text-white">[{topK} Chunks]</span>
                            </label>
                            <input
                                type="range" min={1} max={15} value={topK}
                                onChange={e => setTopK(Number(e.target.value))}
                                className="w-full accent-white"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
                                <span>Similarity Threshold</span>
                                <span className="text-white">[{Math.round(threshold * 100)}%]</span>
                            </label>
                            <input
                                type="range" min={0} max={0.9} step={0.05} value={threshold}
                                onChange={e => setThreshold(Number(e.target.value))}
                                className="w-full accent-white"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border border-white/10 bg-white/5">
                            <div>
                                <label className="flex items-center gap-2 font-mono text-xs text-white uppercase tracking-widest mb-1">
                                    <Zap size={12} className="text-neutral-400" /> HyDE Accelerator
                                </label>
                                <p className="font-mono text-[9px] text-neutral-500 uppercase">Pre-computes hypothetical vectors</p>
                            </div>
                            <Toggle value={useHyDE} onChange={setUseHyDE} />
                        </div>

                        <div className="flex items-center justify-between p-4 border border-white/10 bg-white/5">
                            <div>
                                <label className="flex items-center gap-2 font-mono text-xs text-white uppercase tracking-widest mb-1">
                                    <Sliders size={12} className="text-neutral-400" /> Streaming Output
                                </label>
                                <p className="font-mono text-[9px] text-neutral-500 uppercase">Real-time token injection</p>
                            </div>
                            <Toggle value={streaming} onChange={setStreaming} />
                        </div>

                        <div>
                            <label className="block font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-4">Neural Engine (Model)</label>
                            <div className="grid grid-cols-1 gap-2">
                                {MODEL_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setModel(opt.value)}
                                        className={`flex items-center justify-between p-4 border font-mono text-sm transition-colors ${
                                            model === opt.value ? "border-white text-white bg-white/10" : "border-white/10 text-neutral-400 hover:border-white/30"
                                        }`}
                                    >
                                        <div className="flex flex-col items-start gap-1">
                                            <span>{opt.label}</span>
                                            <span className="text-[9px] opacity-70 uppercase tracking-widest">{opt.desc}</span>
                                        </div>
                                        {model === opt.value && <ChevronRight size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={savingRAG} className="bg-white text-black font-mono text-xs uppercase tracking-widest px-6 py-3 flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50">
                            {savingRAG ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Execute Pipeline Update
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
