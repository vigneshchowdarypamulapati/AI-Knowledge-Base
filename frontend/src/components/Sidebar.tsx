import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MessageSquare,
    Settings,
    LogOut,
    Brain,
    Plus,
    Trash2,
    MoreHorizontal,
    Pin,
    Archive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const navItems = [
    { path: '/settings', icon: Settings, label: 'Settings' }
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { chats, activeChatId, fetchChats, selectChat, deleteChat, clearMessages } = useChat();
    const navigate = useNavigate();
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && !(event.target as Element).closest('.chat-options-menu')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    const handleNewChat = async () => {
        clearMessages();
        navigate('/chat');
    };

    const handleSelectChat = async (chatId: string) => {
        await selectChat(chatId);
        navigate('/chat');
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        try {
            await deleteChat(chatId);
            toast.success('Chat deleted');
        } catch {
            toast.error('Failed to delete chat');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-xl)',
                            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)'
                        }}
                    >
                        <Brain size={24} color="white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-gradient">Knowledge Base</h1>
                        <p className="text-xs" style={{ color: 'var(--gray-500)' }}>AI-Powered RAG</p>
                    </div>
                </div>
            </div>

            {/* New Chat Button */}
            <div style={{ padding: 'var(--space-4)' }}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNewChat}
                    className="btn btn-primary w-full"
                >
                    <Plus size={18} />
                    New Chat
                </motion.button>
            </div>

            {/* Chat History */}
            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
                <p className="text-xs font-medium mb-2 px-4" style={{ color: 'var(--gray-500)' }}>
                    Recent Chats
                </p>
                <ul style={{ listStyle: 'none', padding: '0 var(--space-2)' }}>
                    {chats.length === 0 ? (
                        <li className="text-sm px-3 py-2" style={{ color: 'var(--gray-600)' }}>
                            No chats yet
                        </li>
                    ) : (
                        chats.map((chat) => (
                            <motion.li
                                key={chat._id}
                                whileHover={{ backgroundColor: 'var(--gray-800)' }}
                                onClick={() => handleSelectChat(chat._id)}
                                className={`chat-history-item ${activeChatId === chat._id ? 'active' : ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    marginBottom: 'var(--space-1)',
                                    background: activeChatId === chat._id ? 'var(--gray-800)' : 'transparent',
                                    border: activeChatId === chat._id ? '1px solid var(--primary-500)' : '1px solid transparent'
                                }}
                            >
                                <MessageSquare size={16} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />
                                <span className="text-sm truncate flex-1" style={{
                                    color: activeChatId === chat._id ? 'white' : 'var(--gray-300)'
                                }}>
                                    {chat.title}
                                </span>
                                <div className="chat-options-menu relative">
                                    <motion.button
                                        whileHover={{ color: 'var(--gray-300)' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === chat._id ? null : chat._id);
                                        }}
                                        className="flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
                                        style={{
                                            padding: '4px',
                                            color: 'var(--gray-500)',
                                            opacity: activeChatId === chat._id ? 1 : 0.6,
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none'
                                        }}
                                    >
                                        <MoreHorizontal size={16} />
                                    </motion.button>

                                    {activeMenuId === chat._id && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: '100%',
                                                marginTop: '4px',
                                                background: 'var(--gray-900)',
                                                border: '1px solid var(--gray-800)',
                                                borderRadius: 'var(--radius-md)',
                                                boxShadow: 'var(--shadow-lg)',
                                                zIndex: 50,
                                                minWidth: '120px',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.success('Pin coming soon!');
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--gray-800)]"
                                                style={{ color: 'var(--gray-300)' }}
                                            >
                                                <Pin size={14} /> Pin
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.success('Archive coming soon!');
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--gray-800)]"
                                                style={{ color: 'var(--gray-300)' }}
                                            >
                                                <Archive size={14} /> Archive
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    handleDeleteChat(e, chat._id);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--gray-800)]"
                                                style={{ color: 'var(--error)' }}
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.li>
                        ))
                    )}
                </ul>

                {/* Navigation */}
                <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--gray-800)', paddingTop: 'var(--space-3)' }}>
                    <ul style={{ listStyle: 'none', padding: '0 var(--space-2)' }}>
                        {navItems.map((item) => (
                            <li key={item.path} style={{ marginBottom: 'var(--space-1)' }}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* User Section */}
            <div className="sidebar-footer">
                <div
                    className="flex items-center gap-3"
                    style={{
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--gray-800)',
                        borderRadius: 'var(--radius-lg)'
                    }}
                >
                    <div className="avatar avatar-md avatar-gradient">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                        <p className="font-medium text-sm truncate">{user?.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--gray-500)' }}>{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-ghost"
                        title="Logout"
                        style={{ color: 'var(--gray-400)' }}
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
