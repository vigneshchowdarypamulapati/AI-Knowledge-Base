import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    User, Save, Loader2, Sliders, Brain, Zap,
    ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

type Model = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'mixtral-8x7b-32768';

interface UserSettings {
    topK: number;
    similarityThreshold: number;
    useHyDE: boolean;
    streamingEnabled: boolean;
    model: Model;
}

const MODEL_OPTIONS: { value: Model; label: string; desc: string }[] = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Best quality · Recommended' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', desc: 'Fastest · Lower quality' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8×7B', desc: 'Large context · Balanced' },
];

export default function SettingsPage() {
    const { user, refreshUser } = useAuth();

    const s = (user?.settings ?? {}) as UserSettings;
    const [name, setName] = useState(user?.name ?? '');
    const [topK, setTopK] = useState<number>(s.topK ?? 5);
    const [threshold, setThreshold] = useState<number>(s.similarityThreshold ?? 0.3);
    const [useHyDE, setUseHyDE] = useState<boolean>(s.useHyDE ?? true);
    const [streaming, setStreaming] = useState<boolean>(s.streamingEnabled ?? true);
    const [model, setModel] = useState<Model>(s.model ?? 'llama-3.3-70b-versatile');

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingRAG, setSavingRAG] = useState(false);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            await authAPI.updateProfile({ name });
            await refreshUser?.();
            toast.success('Profile updated');
        } catch {
            toast.error('Failed to update profile');
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
            toast.success('RAG settings saved');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSavingRAG(false);
        }
    };

    const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
        <button type="button" onClick={() => onChange(!value)} className="toggle-btn" id={`toggle-${value}`}>
            {value
                ? <ToggleRight size={28} style={{ color: 'var(--primary-400)' }} />
                : <ToggleLeft size={28} style={{ color: 'var(--gray-600)' }} />
            }
        </button>
    );

    return (
        <Layout>
            <div style={{ padding: 'var(--space-8)', maxWidth: '680px', margin: '0 auto' }}>
                <div className="page-header border-b border-strong pb-4 mb-8">
                    <h1 className="editorial-heading mb-0" style={{ fontSize: '4rem' }}>Configuration.</h1>
                    <p className="text-mono text-muted uppercase tracking-widest text-sm mt-2">
                        Modify identity parameters and retrieval pipeline
                    </p>
                </div>

                {/* ── Profile ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card mb-8"
                >
                    <h2 className="text-serif text-xl border-b border-strong pb-2 mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <User size={18} /> IDENTITY.PARAMS
                    </h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="form-group">
                            <label className="label">COMMUNICATION PROTOCOL [EMAIL]</label>
                            <input
                                type="email"
                                value={user?.email ?? ''}
                                disabled
                                className="input"
                                style={{ opacity: 0.5 }}
                            />
                            <p className="field-hint text-mono uppercase mt-2">Protocol fixed. Mutation locked.</p>
                        </div>
                        <div className="form-group">
                            <label className="label">DESIGNATION ALIAS [NAME]</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="input"
                                placeholder="Alias"
                                required
                            />
                        </div>
                        <button type="submit" disabled={savingProfile} className="btn btn-primary w-full">
                            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            EXECUTE IDENTITY UPDATE
                        </button>
                    </form>
                </motion.div>

                {/* ── RAG Settings ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="card mb-8"
                >
                    <h2 className="text-serif text-xl border-b border-strong pb-2 mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <Brain size={18} /> PIPELINE.CONFIG
                    </h2>
                    <form onSubmit={handleSaveRAG} className="space-y-8">

                        {/* Top-K */}
                        <div className="form-group">
                            <label className="label flex justify-between">
                                <span>RETRIEVAL DENSITY [TOP-K]</span>
                                <span className="text-accent">[{topK} CHUNKS]</span>
                            </label>
                            <input
                                type="range" min={1} max={15} value={topK}
                                onChange={e => setTopK(Number(e.target.value))}
                                className="w-full mt-2"
                            />
                            <div className="flex justify-between text-mono text-xs text-muted uppercase mt-2">
                                <span>1 [PRECISE]</span><span>15 [BROAD]</span>
                            </div>
                            <p className="field-hint text-mono uppercase mt-2">Higher density requires more processing bandwidth.</p>
                        </div>

                        {/* Similarity Threshold */}
                        <div className="form-group">
                            <label className="label flex justify-between">
                                <span>SIMILARITY THRESHOLD</span>
                                <span className="text-accent">[{(threshold * 100).toFixed(0)}%]</span>
                            </label>
                            <input
                                type="range" min={0} max={0.9} step={0.05} value={threshold}
                                onChange={e => setThreshold(Number(e.target.value))}
                                className="w-full mt-2"
                            />
                            <div className="flex justify-between text-mono text-xs text-muted uppercase mt-2">
                                <span>0% [PERMISSIVE]</span><span>90% [STRICT]</span>
                            </div>
                        </div>

                        {/* HyDE Toggle */}
                        <div className="form-group flex items-center justify-between border border-border-strong p-4">
                            <div>
                                <label className="label flex items-center gap-2 mb-1">
                                    <Zap size={14} className="text-accent" /> HYDE ACCELERATOR
                                </label>
                                <p className="field-hint text-mono uppercase text-xs">
                                    Pre-computes hypothetical vectors to enhance accuracy.
                                </p>
                            </div>
                            <Toggle value={useHyDE} onChange={setUseHyDE} />
                        </div>

                        {/* Streaming Toggle */}
                        <div className="form-group flex items-center justify-between border border-border-strong p-4">
                            <div>
                                <label className="label flex items-center gap-2 mb-1">
                                    <Sliders size={14} /> STREAMING OUTPUT
                                </label>
                                <p className="field-hint text-mono uppercase text-xs">
                                    Real-time token injection vs batch transmission.
                                </p>
                            </div>
                            <Toggle value={streaming} onChange={setStreaming} />
                        </div>

                        {/* Model Selection */}
                        <div className="form-group">
                            <label className="label">NEURAL ENGINE [MODEL]</label>
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                {MODEL_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setModel(opt.value)}
                                        className={`flex items-center justify-between p-4 border text-mono text-sm uppercase ${model === opt.value ? 'border-accent text-accent bg-accent/5' : 'border-border-strong text-muted hover:border-text-primary'}`}
                                    >
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="font-bold">{opt.label}</span>
                                            <span className="text-xs opacity-70">{opt.desc}</span>
                                        </div>
                                        {model === opt.value && <ChevronRight size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={savingRAG} className="btn btn-primary w-full">
                            {savingRAG ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            EXECUTE PIPELINE UPDATE
                        </button>
                    </form>
                </motion.div>

                {/* ── Account Info ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 }}
                    className="card"
                >
                    <h2 className="text-serif text-xl border-b border-strong pb-2 mb-4 flex items-center gap-2 uppercase tracking-widest">
                        <User size={18} /> METADATA
                    </h2>
                    <div className="text-mono text-sm space-y-2 uppercase tracking-widest">
                        <div className="flex justify-between border-b border-border-strong pb-2">
                            <span className="text-muted">INITIALIZED</span>
                            <span className="text-primary">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex justify-between pt-2">
                            <span className="text-muted">UUID</span>
                            <span className="text-accent">{user?._id ?? '—'}</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </Layout>
    );
}
