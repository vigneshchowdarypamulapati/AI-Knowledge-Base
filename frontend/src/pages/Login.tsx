import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Brain, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, register, isAuthenticated } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    // Redirect if already authenticated
    if (isAuthenticated) {
        navigate('/chat');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await register(formData.email, formData.password, formData.name);
            }
            navigate('/chat');
        } catch (err: unknown) {
            interface ApiError {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            }
            const apiError = err as ApiError;
            setError(apiError.response?.data?.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Left side - Form */}
            <div className="auth-form-section">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="auth-form-wrapper"
                >
                    {/* Brand */}
                    <div className="auth-brand">
                        <div className="auth-brand-icon">
                            <Brain size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl">AI Knowledge Base</h1>
                            <p className="text-sm" style={{ color: 'var(--gray-400)' }}>RAG-Powered Document Query</p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="auth-card animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-2">
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p style={{ color: 'var(--gray-400)' }} className="mb-6">
                            {isLogin
                                ? 'Sign in to access your knowledge base'
                                : 'Get started with your AI-powered documents'}
                        </p>

                        {error && (
                            <div className="alert alert-error">
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div className="mb-4">
                                    <label className="label">Name</label>
                                    <div className="input-group">
                                        <User size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input"
                                            placeholder="Your name"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="label">Email</label>
                                <div className="input-group">
                                    <Mail size={18} className="input-icon" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="label">Password</label>
                                <div className="input-group">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="input"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full"
                                style={{ padding: '0.875rem 1.5rem' }}
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <p className="mt-6 text-center text-sm" style={{ color: 'var(--gray-400)' }}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                }}
                                style={{ color: 'var(--primary-400)' }}
                                className="font-medium"
                            >
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Right side - Hero */}
            <div className="auth-hero-section">
                <div className="auth-hero-content">
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="auth-hero-icon"
                    >
                        <Brain size={56} />
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-4 text-gradient">
                        Your AI-Powered Knowledge Base
                    </h2>
                    <p style={{ color: 'var(--gray-400)' }} className="text-lg">
                        Upload documents, ask questions, and get intelligent answers grounded in your own data.
                    </p>
                    <div className="auth-formats">
                        {['PDF', 'TXT', 'DOCX'].map((format) => (
                            <span key={format} className="auth-format-badge">
                                {format}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
