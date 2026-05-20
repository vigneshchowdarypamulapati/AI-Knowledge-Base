import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Paperclip, Loader2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { useDocuments } from '../context/DocumentContext';
import { useChat } from '../context/ChatContext';
import { chatAPI } from '../utils/api';
import CitationPanel from './CitationPanel';
import type { Source } from './CitationPanel';

interface RetrievalStats {
    chunksFound: number;
    hydeUsed: boolean;
    topK: number;
    model: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    retrievalStats?: RetrievalStats;
    timestamp?: Date;
}

export default function ChatWindow() {
    const { selectedDocuments, documents, uploadDocument } = useDocuments();
    const {
        messages,
        activeChatId,
        addMessage,
        updateMessage,
        createNewChat,
        fetchChats
    } = useChat();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setCurrentChatId(activeChatId);
    }, [activeChatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Only PDF, TXT, DOCX.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File too large (Max 10MB).');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading(`Uploading ${file.name}…`);
        try {
            await uploadDocument(file);
            toast.success(`${file.name} uploaded!`, { id: toastId });
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch {
            toast.error('Upload failed.', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessageContent = input.trim();
        const userMsgId = `user-${Date.now()}`;

        addMessage({
            id: userMsgId,
            role: 'user',
            content: userMessageContent,
            timestamp: new Date()
        } as Message);

        setInput('');
        setIsLoading(true);

        // Create chat session if needed
        let chatId = currentChatId;
        if (!chatId) {
            try {
                const newChat = await createNewChat(selectedDocuments);
                chatId = newChat._id;
                setCurrentChatId(chatId);
                const title = userMessageContent.substring(0, 50) + (userMessageContent.length > 50 ? '…' : '');
                await chatAPI.update(chatId, { title });
                fetchChats();
            } catch {
                toast.error('Failed to start chat');
                setIsLoading(false);
                return;
            }
        }

        // Add placeholder assistant message
        const assistantMsgId = `assistant-${Date.now()}`;
        addMessage({
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date()
        } as Message);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: userMessageContent,
                    documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
                    chatId
                })
            });

            if (!response.ok) throw new Error('Stream failed to start');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No reader available');

            let currentAnswer = '';
            let currentSources: Source[] = [];
            let currentStats: RetrievalStats | null = null;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') break;

                    try {
                        const data = JSON.parse(dataStr);

                        if (data.type === 'sources') {
                            currentSources = data.content;
                            updateMessage(assistantMsgId, { sources: currentSources } as Partial<Message>);
                        } else if (data.type === 'retrieval_stats') {
                            currentStats = data.content;
                            updateMessage(assistantMsgId, { retrievalStats: currentStats } as Partial<Message>);
                        } else if (data.type === 'answer') {
                            currentAnswer += data.content;
                            updateMessage(assistantMsgId, { content: currentAnswer } as Partial<Message>);
                        } else if (data.type === 'error') {
                            toast.error(data.content);
                        }
                    } catch {
                        // ignore parse errors on partial chunks
                    }
                }
            }

            fetchChats();
        } catch (error) {
            console.error('Stream error:', error);
            toast.error('Connection error. Please try again.');
            updateMessage(assistantMsgId, { content: '⚠️ Error: Could not generate a response.' } as Partial<Message>);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedDocNames = documents
        .filter(doc => selectedDocuments.includes(doc._id))
        .map(doc => doc.originalName);

    const typedMessages = messages as Message[];

    return (
        <div className="chat-container h-full flex flex-col relative">
            {/* Header */}
            <div className="chat-header flex items-center justify-between">
                <h2 className="text-serif font-semibold flex items-center gap-2 uppercase tracking-widest text-lg">
                    <Bot size={22} className="text-accent" />
                    System.Assistant
                </h2>
                <div className="flex items-center gap-3">
                    {selectedDocNames.length > 0 ? (
                        <div className="text-mono text-xs uppercase tracking-widest border border-accent text-accent px-2 py-1 flex items-center gap-1">
                            <Zap size={12} />
                            [{selectedDocNames.length}] Active
                        </div>
                    ) : (
                        <span className="text-mono text-xs text-muted uppercase tracking-widest">
                            [No Context]
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {typedMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="mb-6 text-accent">
                            <Bot size={48} />
                        </div>
                        <h3 className="editorial-heading" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                            Awaiting Input.
                        </h3>
                        <p className="text-mono text-muted max-w-md uppercase tracking-widest text-sm mb-8">
                            Select data sources from the sidebar and input your query.
                        </p>
                        <div className="flex flex-col gap-3 w-full max-w-md">
                            {[
                                'Identify key risks in the current context.',
                                'Summarize the primary objectives.',
                                'Extract statistical anomalies.'
                            ].map(hint => (
                                <button
                                    key={hint}
                                    onClick={() => setInput(hint)}
                                    className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}
                                >
                                    &gt; {hint}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {typedMessages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`message ${message.role === 'user' ? 'message-user' : ''}`}
                        >
                            <div className={`message-content ${message.role === 'user' ? 'message-content-user' : 'message-content-ai'}`}>
                                <div className="text-mono text-xs uppercase tracking-widest mb-2 opacity-50 flex items-center gap-2">
                                    {message.role === 'assistant' ? <><Bot size={12} /> SYS.RESPONSE</> : <><User size={12} /> USER.QUERY</>}
                                </div>
                                <div className="markdown-body">
                                    {message.role === 'assistant' ? (
                                        message.content ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code: ({ node, ...props }) => (
                                                        <code className="bg-[var(--bg-base)] border border-[var(--border-strong)] px-1 font-mono text-sm" {...props} />
                                                    ),
                                                    pre: ({ node, ...props }) => (
                                                        <div className="overflow-auto my-4 bg-[var(--bg-base)] border border-[var(--border-strong)] p-4 font-mono">
                                                            <pre {...props} />
                                                        </div>
                                                    )
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <div className="thinking-indicator">
                                                <span />
                                                <span />
                                                <span />
                                            </div>
                                        )
                                    ) : (
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                                    )}
                                </div>

                                {/* ── Citation Panel ── */}
                                {message.role === 'assistant' && message.content && (
                                    <CitationPanel
                                        sources={message.sources ?? []}
                                        retrievalStats={message.retrievalStats ?? null}
                                    />
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Loading pulse */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-mono text-accent text-xs uppercase tracking-widest mt-4 flex items-center gap-2"
                    >
                        <Loader2 size={12} className="animate-spin" />
                        [QUERYING DATABANKS...]
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="chat-input-area">
                <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept=".pdf,.txt,.docx"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isLoading}
                        className="btn btn-secondary upload-btn"
                        title="Upload Document"
                    >
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                    </button>

                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder={
                                selectedDocuments.length > 0
                                    ? '> ENTER QUERY...'
                                    : '> AWAITING SOURCE SELECTION...'
                            }
                            className="input w-full resize-none min-h-[50px] max-h-[150px]"
                            rows={1}
                            disabled={isLoading}
                        />
                        <AnimatePresence>
                            {input.trim() && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 bottom-2 btn btn-primary p-2 w-8 h-8 flex items-center justify-center"
                                    style={{ borderRadius: 0 }}
                                >
                                    <Send size={14} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </form>
            </div>
        </div>
    );
}
