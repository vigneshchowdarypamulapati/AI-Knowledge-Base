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
    Archive,
    FileText,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const navItems = [
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
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
                <div className="brand-logo">
                    <Brain size={24} />
                    DocMind
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
                    NEW CHAT
                </motion.button>
            </div>

            {/* Chat History */}
            <div className="sidebar-nav">
                <p className="text-mono text-xs text-muted mb-2 px-4 uppercase tracking-widest">
                    Recent
                </p>
                <ul style={{ listStyle: 'none' }}>
                    {chats.length === 0 ? (
                        <li className="text-mono text-sm px-4 py-2 text-muted">
                            No chats yet
                        </li>
                    ) : (
                        chats.map((chat) => (
                            <motion.li
                                key={chat._id}
                                onClick={() => handleSelectChat(chat._id)}
                                className={`nav-item ${activeChatId === chat._id ? 'active' : ''}`}
                                style={{ cursor: 'pointer', position: 'relative' }}
                            >
                                <MessageSquare size={16} />
                                <span className="truncate flex-1">{chat.title}</span>
                                <div className="chat-options-menu relative" style={{ marginLeft: 'auto' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === chat._id ? null : chat._id);
                                        }}
                                        className="btn-ghost"
                                        style={{ padding: '4px' }}
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    {activeMenuId === chat._id && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: '100%',
                                                background: 'var(--bg-surface-elevated)',
                                                border: '1px solid var(--border-strong)',
                                                zIndex: 50,
                                                minWidth: '120px'
                                            }}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.success('Pin coming soon!');
                                                    setActiveMenuId(null);
                                                }}
                                                className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start' }}
                                            >
                                                <Pin size={14} /> PIN
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.success('Archive coming soon!');
                                                    setActiveMenuId(null);
                                                }}
                                                className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start' }}
                                            >
                                                <Archive size={14} /> ARCHIVE
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    handleDeleteChat(e, chat._id);
                                                    setActiveMenuId(null);
                                                }}
                                                className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', color: 'var(--error)' }}
                                            >
                                                <Trash2 size={14} /> DELETE
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.li>
                        ))
                    )}
                </ul>

                {/* Navigation */}
                <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-strong)', paddingTop: 'var(--space-4)' }}>
                    <p className="text-mono text-xs text-muted mb-2 px-4 uppercase tracking-widest">
                        System
                    </p>
                    <ul style={{ listStyle: 'none' }}>
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* User Section */}
            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0 text-mono">
                        <p className="font-bold text-sm text-primary truncate uppercase">{user?.name}</p>
                        <p className="text-xs text-muted truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-ghost"
                        title="Logout"
                        style={{ padding: '4px' }}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
