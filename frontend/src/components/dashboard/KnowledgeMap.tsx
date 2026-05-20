"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useDocuments } from "@/context/DocumentContext";
import { Settings, Database, MessageSquare, LogOut, UploadCloud, FileText, Loader2, BarChart2, Trash2, Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function KnowledgeMap() {
    const { user, logout } = useAuth();
    const { documents, fetchDocuments, uploadDocument, deleteDocument, selectedDocuments, toggleDocumentSelection, isLoading } = useDocuments();
    const router = useRouter();
    const pathname = usePathname();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [filterQuery, setFilterQuery] = useState("");

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await handleFiles(files);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            await handleFiles(Array.from(e.target.files));
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFiles = async (files: File[]) => {
        for (const file of files) {
            if (file.type !== "application/pdf" && file.type !== "text/plain") {
                toast.error(`Invalid file type: ${file.name}. Only PDF and TXT allowed.`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`File too large: ${file.name}. Max 10MB.`);
                continue;
            }
            toast.promise(
                uploadDocument(file),
                {
                    loading: `Indexing ${file.name}...`,
                    success: `${file.name} vectorized and ready.`,
                    error: `Failed to index ${file.name}`,
                },
                {
                    style: {
                        borderRadius: '0',
                        background: '#0a0a0a',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }
                }
            );
        }
    };

    const navItems = [
        { label: "Reasoning Engine", icon: MessageSquare, path: "/dashboard" },
        { label: "Telemetry", icon: BarChart2, path: "/dashboard/telemetry" },
        { label: "Configuration", icon: Settings, path: "/dashboard/settings" }
    ];

    return (
        <div className={`flex flex-col bg-obsidian border-r border-white/10 relative z-20 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCollapsed ? "w-16" : "w-80"
        }`}>
            {/* Header */}
            <div className="p-4 h-16 border-b border-white/10 flex items-center justify-between">
                {!isCollapsed && (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/20 flex items-center justify-center shrink-0">
                            <Database size={16} className="text-white" />
                        </div>
                        <div className="truncate">
                            <h2 className="font-serif text-lg tracking-tight text-white leading-none">DocMind.</h2>
                            <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest mt-1">Intelligence OS</p>
                        </div>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/20 flex items-center justify-center shrink-0 mx-auto">
                        <Database size={16} className="text-white" />
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-all ${
                                isActive 
                                    ? "bg-white/10 text-white" 
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                            } ${isCollapsed ? "justify-center px-0" : ""}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon size={14} className={isActive ? "text-white" : "text-neutral-500"} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Knowledge Map (Documents) */}
            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto hide-scrollbar border-t border-white/10">
                    <div className="p-4 pb-2 flex items-center justify-between sticky top-0 bg-obsidian/90 backdrop-blur-md z-10">
                        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">Active Databanks</span>
                        <span className="font-mono text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            {documents.length}
                        </span>
                    </div>

                    <div className="px-4 pb-3">
                        <div className="relative">
                            <Search size={10} className="absolute left-2.5 top-2.5 text-neutral-500" />
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder="Filter Databanks..."
                                className="w-full bg-white/5 border border-white/10 pl-7 pr-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-white focus:outline-none focus:border-white/30 transition-all rounded"
                            />
                        </div>
                    </div>

                    <div className="px-4 pb-4 space-y-2">
                        <AnimatePresence>
                            {isLoading ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-4">
                                    <Loader2 size={16} className="animate-spin text-neutral-500" />
                                </motion.div>
                            ) : documents.filter(doc => doc.filename.toLowerCase().includes(filterQuery.toLowerCase())).map((doc) => {
                                const isSelected = selectedDocuments.includes(doc._id);
                                return (
                                    <motion.div
                                        key={doc._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => doc.status === 'embedded' && toggleDocumentSelection(doc._id)}
                                        className={`group flex flex-col p-3 border transition-all cursor-pointer ${
                                            isSelected 
                                                ? "border-white bg-white/5" 
                                                : "border-white/5 hover:border-white/20 bg-white/[0.02]"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="relative mt-0.5 shrink-0">
                                                {isSelected ? (
                                                    <Check size={14} className="text-white" />
                                                ) : (
                                                    <FileText size={14} className="text-neutral-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between">
                                                    <p className="text-xs text-neutral-200 truncate font-medium">{doc.filename}</p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteDocument(doc._id);
                                                            toast.success(`Deleted ${doc.filename}`, { style: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-all shrink-0"
                                                    title="Delete Document"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="flex items-center gap-1 text-[9px] font-mono text-neutral-500 uppercase">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        doc.status === 'embedded' ? 'bg-green-500' :
                                                        doc.status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                                                    }`} />
                                                    {doc.status}
                                                </span>
                                                <span className="text-[9px] font-mono text-neutral-600 uppercase">
                                                    {doc.chunkCount} CHUNKS
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
            )}

            {isCollapsed && <div className="flex-1 border-t border-white/10" />}

            {/* Drop Zone */}
            {!isCollapsed && (
                <div className="p-4 border-t border-white/10 bg-obsidian">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        accept=".pdf,.txt"
                        className="hidden"
                    />
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full p-4 border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                            isDragging 
                                ? "border-white bg-white/5" 
                                : "border-white/20 hover:border-white/40 hover:bg-white/[0.02]"
                        }`}
                    >
                        <UploadCloud size={20} className={isDragging ? "text-white" : "text-neutral-500"} />
                        <div>
                            <p className="font-mono text-xs text-neutral-300">Ingest New Data</p>
                            <p className="font-mono text-[9px] text-neutral-500 mt-1 uppercase tracking-widest">Drop PDF/TXT here</p>
                        </div>
                    </div>
                </div>
            )}

            {/* User Profile (Bottom) */}
            <div className={`p-4 border-t border-white/10 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
                {!isCollapsed ? (
                    <>
                        <div className="min-w-0">
                            <p className="font-mono text-xs text-white truncate">{user?.name}</p>
                            <p className="font-mono text-[10px] text-neutral-500 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"
                            title="Terminate Session"
                        >
                            <LogOut size={14} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={logout}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-neutral-500 hover:text-white transition-colors"
                        title="Terminate Session"
                    >
                        <LogOut size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
