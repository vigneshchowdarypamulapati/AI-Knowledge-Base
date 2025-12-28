import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Paperclip, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { useDocuments } from '../context/DocumentContext';
import { useChat } from '../context/ChatContext';
import { chatAPI } from '../utils/api';

interface Source {
    documentId: string;
    documentName: string;
    chunkText: string;
    similarity: number;
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

    useEffect(() => {
        setCurrentChatId(activeChatId);
    }, [activeChatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
        const toastId = toast.loading(`Uploading ${file.name}...`);

        try {
            await uploadDocument(file);
            toast.success(`${file.name} uploaded!`, { id: toastId });
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error(error);
            toast.error('Upload failed.', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessageContent = input.trim();
        const userMsgId = Date.now().toString();

        addMessage({
            id: userMsgId,
            role: 'user',
            content: userMessageContent,
            timestamp: new Date()
        });

        setInput('');
        setIsLoading(true);

        let chatId = currentChatId;
        if (!chatId) {
            try {
                const newChat = await createNewChat(selectedDocuments);
                chatId = newChat._id;
                setCurrentChatId(chatId);

                const title = userMessageContent.substring(0, 50) + (userMessageContent.length > 50 ? '...' : '');
                await chatAPI.update(chatId, { title });
                fetchChats();
            } catch (error) {
                console.error('Failed to create chat:', error);
                toast.error('Failed to start chat');
                setIsLoading(false);
                return;
            }
        }

        const assistantMsgId = (Date.now() + 1).toString();
        addMessage({
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date()
        });

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
                    chatId: chatId
                })
            });

            if (!response.ok) throw new Error('Failed to start stream');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No reader available');

            let currentAnswer = '';
            let currentSources: Source[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.type === 'answer') {
                                currentAnswer += data.content;
                                updateMessage(assistantMsgId, { content: currentAnswer });
                            } else if (data.type === 'sources') {
                                currentSources = data.content;
                                updateMessage(assistantMsgId, { sources: currentSources });
                            } else if (data.type === 'error') {
                                toast.error(data.content);
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE:', parseError);
                        }
                    }
                }
            }

            fetchChats();

        } catch (error) {
            console.error('Stream Error:', error);
            toast.error('Something went wrong. Please check your connection.');
            updateMessage(assistantMsgId, { content: '⚠️ Error: Could not generate response.' });
        } finally {
            setIsLoading(false);
        }
    };

    const selectedDocNames = documents
        .filter(doc => selectedDocuments.includes(doc._id))
        .map(doc => doc.originalName);

    return (
        <div className="chat-container h-full flex flex-col relative">
            <div className="chat-header flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Bot size={24} className="text-primary-500" />
                    AI Assistant
                </h2>
                <div className="text-sm text-gray-500">
                    {selectedDocNames.length} documents selected
                </div>
            </div>

            <div className="chat-messages flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="empty-state h-full flex flex-col items-center justify-center">
                        <div className="empty-state-icon mb-4" style={{
                            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
                            color: 'white',
                            padding: '20px',
                            borderRadius: '20px'
                        }}>
                            <Bot size={40} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">How can I help you?</h3>
                        <p className="text-gray-400 max-w-md text-center">
                            Select documents from the right sidebar to start chatting with your knowledge base.
                        </p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`message ${message.role === 'user' ? 'message-user' : ''}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="message-avatar message-avatar-ai">
                                    <Bot size={18} />
                                </div>
                            )}

                            <div className={`message-content ${message.role === 'user' ? 'message-content-user' : 'message-content-ai'}`}>
                                <div className="markdown-body">
                                    {message.role === 'assistant' ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code: ({ node, ...props }) => (
                                                    <code className="bg-black/20 rounded px-1" {...props} />
                                                ),
                                                pre: ({ node, ...props }) => (
                                                    <div className="overflow-auto my-2 rounded-lg bg-black/30 p-3">
                                                        <pre {...props} />
                                                    </div>
                                                )
                                            }}
                                        >
                                            {message.content || 'Thinking...'}
                                        </ReactMarkdown>
                                    ) : (
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                                    )}
                                </div>


                            </div>

                            {message.role === 'user' && (
                                <div className="message-avatar message-avatar-user">
                                    <User size={18} />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept=".pdf,.txt,.docx"
                    />
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isLoading}
                        className="btn btn-secondary upload-btn"
                        title="Upload Document"
                    >
                        {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Paperclip size={22} />}
                    </motion.button>

                    <div className="flex-1 relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder={selectedDocuments.length > 0 ? "Ask about selected docs..." : "Select docs from sidebar first..."}
                            className="input w-full resize-none py-5 px-4 pr-12 min-h-[64px] max-h-[150px]"
                            style={{ borderRadius: 'var(--radius-lg)' }}
                            rows={1}
                            disabled={isLoading}
                        />
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: input.trim() ? 1 : 0, scale: input.trim() ? 1 : 0.8 }}
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 bottom-2 btn btn-primary p-2 rounded-lg w-8 h-8 flex items-center justify-center"
                        >
                            <Send size={14} />
                        </motion.button>
                    </div>
                </form>
            </div>
        </div>
    );
}
