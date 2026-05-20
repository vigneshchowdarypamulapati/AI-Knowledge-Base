"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { chatAPI } from '../utils/api';

interface Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: {
        documentId: string;
        documentName: string;
        chunkText: string;
        similarity: number;
    }[];
    timestamp?: Date;
}

interface Chat {
    _id: string;
    title: string;
    messages?: Message[];
    documentIds?: string[];
    createdAt: string;
    updatedAt: string;
}

interface ChatContextType {
    chats: Chat[];
    activeChat: Chat | null;
    activeChatId: string | null;
    messages: Message[];
    isLoading: boolean;
    fetchChats: () => Promise<void>;
    createNewChat: (documentIds?: string[]) => Promise<Chat>;
    selectChat: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    addMessage: (message: Message) => void;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchChats = useCallback(async () => {
        try {
            const response = await chatAPI.getAll();
            setChats(response.data.data.chats);
        } catch (error) {
            console.error('Failed to fetch chats:', error);
        }
    }, []);

    const createNewChat = useCallback(async (documentIds?: string[]) => {
        try {
            const response = await chatAPI.create({ documentIds });
            const newChat = response.data.data.chat;
            setChats(prev => [newChat, ...prev]);
            setActiveChat(newChat);
            setActiveChatId(newChat._id);
            setMessages([]);
            return newChat;
        } catch (error) {
            console.error('Failed to create chat:', error);
            throw error;
        }
    }, []);

    const selectChat = useCallback(async (chatId: string) => {
        setIsLoading(true);
        try {
            const response = await chatAPI.getOne(chatId);
            const chat = response.data.data.chat;
            setActiveChat(chat);
            setActiveChatId(chatId);

            // Map backend messages to frontend format
            const chatMessages: Message[] = chat.messages?.map((msg: {
                role: 'user' | 'assistant';
                content: string;
                sources?: Message['sources'];
                timestamp?: string;
                _id?: string;
            }) => ({
                id: msg._id || Date.now().toString(),
                role: msg.role,
                content: msg.content,
                sources: msg.sources,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            })) || [];

            setMessages(chatMessages);
        } catch (error) {
            console.error('Failed to load chat:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deleteChat = useCallback(async (chatId: string) => {
        try {
            await chatAPI.delete(chatId);
            setChats(prev => prev.filter(c => c._id !== chatId));

            // If deleted chat was active, clear it
            if (activeChatId === chatId) {
                setActiveChat(null);
                setActiveChatId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            throw error;
        }
    }, [activeChatId]);

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
        setMessages(prev => prev.map(msg =>
            msg.id === id ? { ...msg, ...updates } : msg
        ));
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setActiveChat(null);
        setActiveChatId(null);
    }, []);

    return (
        <ChatContext.Provider
            value={{
                chats,
                activeChat,
                activeChatId,
                messages,
                isLoading,
                fetchChats,
                createNewChat,
                selectChat,
                deleteChat,
                addMessage,
                updateMessage,
                clearMessages
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
