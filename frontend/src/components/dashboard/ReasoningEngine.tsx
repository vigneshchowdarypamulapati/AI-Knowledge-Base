"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CornerDownLeft, TerminalSquare, Plus, Sliders, Sparkles, HelpCircle } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useDocuments } from "@/context/DocumentContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ProofInspector, { Citation } from "./ProofInspector";
import toast from "react-hot-toast";

export default function ReasoningEngine() {
    const { activeChat, messages, createNewChat, addMessage, updateMessage, clearMessages } = useChat();
    const { selectedDocuments } = useDocuments();
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [hasActiveChat, setHasActiveChat] = useState(false);
    const [engineProfile, setEngineProfile] = useState<"turbo" | "deep">("turbo");
    const [ragMode, setRagMode] = useState<"direct" | "hyde">("direct");

    const [lastQuery, setLastQuery] = useState("");
    const [showShortcuts, setShowShortcuts] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                if (e.key === "Escape") {
                    target.blur();
                }
                return;
            }

            if (e.key === "?" || e.key === "h") {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            } else if (e.key === "Escape") {
                setSelectedCitation(null);
                setShowShortcuts(false);
            } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                clearMessages();
                toast.success("Reasoning Session Cleared", { style: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [clearMessages]);

    useEffect(() => {
        setHasActiveChat(!!activeChat);
    }, [activeChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const question = input.trim();
        setLastQuery(question);
        setInput("");
        
        let chatId = activeChat?._id;
        if (!chatId) {
            const newChat = await createNewChat(selectedDocuments);
            chatId = newChat._id;
        }

        const userMsgId = Date.now().toString();
        addMessage({ id: userMsgId, role: "user", content: question });

        const aiMsgId = (Date.now() + 1).toString();
        addMessage({ id: aiMsgId, role: "assistant", content: "" });
        setIsStreaming(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    question, 
                    chatId,
                    documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined
                })
            });

            if (!response.ok) throw new Error("Failed to query");
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const dataStr = line.slice(6).trim();
                    if (dataStr === "[DONE]") break;

                    try {
                        const data = JSON.parse(dataStr);
                        if (data.type === "answer") {
                            accumulatedContent += data.content;
                            updateMessage(aiMsgId, { content: accumulatedContent });
                        } else if (data.type === "sources") {
                            const formattedSources = data.content.map((src: any) => ({
                                documentId: src.documentId,
                                documentName: src.documentName,
                                chunkText: src.chunkText,
                                similarity: src.similarity
                            }));
                            updateMessage(aiMsgId, { sources: formattedSources });
                        } else if (data.type === "error") {
                            toast.error(data.content);
                        }
                    } catch (e) {
                        // Ignore parse errors on partial chunks
                    }
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            updateMessage(aiMsgId, { content: "Error: System failed to execute the query." });
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 flex flex-col min-w-0 bg-obsidian-light/30">
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-6">
                    <div className="flex items-center min-w-0">
                        <TerminalSquare size={16} className="text-neutral-500 mr-3 shrink-0" />
                        <span className="font-mono text-xs text-neutral-400 uppercase tracking-widest truncate">
                            Reasoning Engine {hasActiveChat ? `· Active` : `· Idle`}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                        {/* Profiles Picker */}
                        <div className="hidden sm:flex items-center gap-1">
                            <span className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest">Model:</span>
                            <div className="flex bg-white/5 border border-white/10 p-0.5 rounded">
                                <button
                                    onClick={() => {
                                        setEngineProfile("turbo");
                                        toast.success("Switched to Turbo Engine Profile", { style: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
                                    }}
                                    className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer ${
                                        engineProfile === "turbo" 
                                            ? "bg-white text-black font-bold" 
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                >
                                    Turbo
                                </button>
                                <button
                                    onClick={() => {
                                        setEngineProfile("deep");
                                        toast.success("Activated Deep Reasoning Engine (CoT)", { style: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
                                    }}
                                    className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer ${
                                        engineProfile === "deep" 
                                            ? "bg-white text-black font-bold" 
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                >
                                    Deep
                                </button>
                            </div>
                        </div>

                        {/* RAG optimization Picker */}
                        <div className="hidden sm:flex items-center gap-1">
                            <span className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest">Search:</span>
                            <div className="flex bg-white/5 border border-white/10 p-0.5 rounded">
                                <button
                                    onClick={() => {
                                        setRagMode("direct");
                                        toast.success("RAG Context: Direct Mode active", { style: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
                                    }}
                                    className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer ${
                                        ragMode === "direct" 
                                            ? "bg-white text-black font-bold" 
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                    title="Inject exact document matches"
                                >
                                    Direct
                                </button>
                                <button
                                    onClick={() => {
                                        setRagMode("hyde");
                                        toast.success("RAG Context: HyDE Search Mode active", { style: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }});
                                    }}
                                    className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all cursor-pointer ${
                                        ragMode === "hyde" 
                                            ? "bg-white text-black font-bold" 
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                    title="Generate hypothetical answers to expand context search"
                                >
                                    HyDE
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowShortcuts(true)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Keyboard Shortcuts [?]"
                        >
                            <HelpCircle size={12} />
                        </button>

                        {hasActiveChat && (
                            <button
                                onClick={clearMessages}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-all font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                            >
                                <Plus size={12} />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 py-8 hide-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-12">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full mt-24">
                                <div className="opacity-30 flex flex-col items-center">
                                    <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite] mb-6">
                                        <div className="w-2 h-2 bg-white rounded-full absolute top-0" />
                                    </div>
                                    <p className="font-serif text-2xl italic text-white mb-2">Awaiting Instructions.</p>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-8">Initialize a query to begin reasoning</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                                    {[
                                        "Summarize the main achievements in this document",
                                        "What are the core technical projects listed?",
                                        "Identify any gaps or weaknesses in the experience",
                                        "Extract the primary objective or contact info"
                                    ].map((hint, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setInput(hint)}
                                            className="p-3 border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/20 text-neutral-400 hover:text-white transition-all text-left font-mono text-[10px] uppercase tracking-wider leading-relaxed"
                                        >
                                            &gt; {hint}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                                            {msg.role === "user" ? "User.Query" : "System.Response"}
                                        </span>
                                    </div>
                                    <div className={`max-w-[85%] ${msg.role === "user" ? "bg-white/5 border border-white/10 rounded p-4" : ""}`}>
                                        <div className={`prose prose-invert max-w-none ${msg.role === "assistant" ? "font-serif text-lg leading-relaxed text-neutral-300 animate-fadeIn" : "font-mono text-sm text-neutral-200"}`}>
                                            {msg.content ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <div className="flex flex-col gap-2.5 py-2 w-64">
                                                    <div className="h-3.5 bg-white/10 rounded animate-pulse w-full" />
                                                    <div className="h-3.5 bg-white/10 rounded animate-pulse w-5/6" />
                                                    <div className="h-3.5 bg-white/10 rounded animate-pulse w-2/3" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Citations */}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/10">
                                                {msg.sources.map((src, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedCitation(src)}
                                                        className={`citation-pill ${selectedCitation?.chunkText === src.chunkText ? "bg-white/10 border-white/30 text-white" : ""}`}
                                                    >
                                                        [{i + 1}] {src.documentName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 shrink-0 border-t border-white/10 bg-obsidian/80 backdrop-blur-md">
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSubmit} className="relative group">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                placeholder="Input query vector... [Cmd + Enter]"
                                rows={1}
                                disabled={isStreaming}
                                className="w-full bg-white/5 border border-white/10 py-4 pl-6 pr-16 text-white font-mono text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all disabled:opacity-50 resize-none min-h-[56px] max-h-[200px] hide-scrollbar"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isStreaming}
                                className="absolute right-2 top-2 bottom-2 px-4 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                            >
                                <CornerDownLeft size={16} />
                            </button>
                        </form>
                        <div className="mt-3 flex justify-between items-center px-1">
                            <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-50" />
                                Model Active
                            </span>
                            <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest">
                                Cmd + Enter to execute
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Pane: Proof Inspector */}
            <ProofInspector 
                citation={selectedCitation} 
                query={lastQuery}
                onClose={() => setSelectedCitation(null)} 
            />

            {/* Keyboard Shortcuts Modal */}
            <AnimatePresence>
                {showShortcuts && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="bg-obsidian-light border border-white/10 w-full max-w-sm p-5 shadow-2xl relative"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="font-serif text-sm text-white">Keyboard Navigation</h3>
                                    <p className="font-mono text-[8px] text-neutral-500 uppercase tracking-widest mt-0.5">Control Center Bindings</p>
                                </div>
                                <button
                                    onClick={() => setShowShortcuts(false)}
                                    className="font-mono text-[8px] text-neutral-500 hover:text-white px-2 py-0.5 border border-white/10 bg-white/5 rounded cursor-pointer"
                                >
                                    [ESC]
                                </button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { keys: ["CMD", "ENTER"], desc: "EXECUTE QUERY" },
                                    { keys: ["SHIFT", "ENTER"], desc: "NEW LINE" },
                                    { keys: ["CMD", "K"], desc: "RESET SESSION" },
                                    { keys: ["ESC"], desc: "CLOSE PANELS" },
                                    { keys: ["?"], desc: "TOGGLE GUIDE" }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">{item.desc}</span>
                                        <div className="flex gap-1">
                                            {item.keys.map((k, i) => (
                                                <kbd key={i} className="font-mono text-[8px] text-white bg-white/10 px-1.5 py-0.5 border border-white/10 rounded">
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
