import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

type AuthMode = 'login' | 'register' | 'forgot_password';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, register, isAuthenticated } = useAuth();
    
    const [mode, setMode] = useState<AuthMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
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
        setSuccessMessage('');
        setIsLoading(true);

        try {
            if (mode === 'login') {
                await login(formData.email, formData.password);
                navigate('/chat');
            } else if (mode === 'register') {
                await register(formData.email, formData.password, formData.name);
                navigate('/chat');
            } else if (mode === 'forgot_password') {
                const response = await authAPI.resetPassword({ 
                    email: formData.email, 
                    newPassword: formData.password 
                });
                setSuccessMessage(response.data.message);
                // Clear password field but keep email
                setFormData(prev => ({ ...prev, password: '' }));
                // Automatically switch back to login after 3 seconds
                setTimeout(() => setMode('login'), 3000);
            }
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

    const toggleMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError('');
        setSuccessMessage('');
    };

    return (
        <div className="auth-container">
            {/* Left side - Editorial Hero */}
            <div className="auth-editorial-panel">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="brand-logo mb-10">
                        <Brain size={24} />
                        DocMind AI
                    </div>
                    <h1 className="editorial-heading">
                        Intelligent<br />Document<br />Processing.
                    </h1>
                    <p className="text-mono text-muted mt-4 max-w-md">
                        Upload documents, ask questions, and get precise, grounded answers.
                    </p>
                </motion.div>
                <div className="text-mono text-muted text-sm">
                    SYS.VER: 0.9.4 // STATUS: ONLINE
                </div>
            </div>

            {/* Right side - Form */}
            <div className="auth-form-panel">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="auth-form-wrapper"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="card"
                        >
                            <h2 className="text-serif font-semibold mb-2" style={{ fontSize: '2rem' }}>
                                {mode === 'login' && 'Authenticate.'}
                                {mode === 'register' && 'Initialize.'}
                                {mode === 'forgot_password' && 'Recover.'}
                            </h2>
                            <p className="text-mono text-muted mb-6 text-sm uppercase tracking-widest">
                                {mode === 'login' && 'Enter credentials'}
                                {mode === 'register' && 'Create new user entity'}
                                {mode === 'forgot_password' && 'Reset access key'}
                            </p>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="mb-4 text-mono text-sm" style={{ color: 'var(--error)' }}
                                >
                                    [ERROR]: {error}
                                </motion.div>
                            )}

                            {successMessage && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="mb-4 text-mono text-sm" style={{ color: 'var(--success)' }}
                                >
                                    [SUCCESS]: {successMessage}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {mode === 'register' && (
                                    <div className="form-group">
                                        <label className="label">Identity Designation</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="label">Communication Protocol (Email)</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input"
                                        placeholder="sysadmin@docmind.ai"
                                        required
                                    />
                                </div>

                                <div className="form-group mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="label" style={{ marginBottom: 0 }}>
                                            {mode === 'forgot_password' ? 'New Access Key' : 'Access Key'}
                                        </label>
                                        
                                        {mode === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => toggleMode('forgot_password')}
                                                className="btn-ghost text-xs"
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
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

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn btn-primary w-full"
                                >
                                    {isLoading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'login' && 'Execute Login'}
                                            {mode === 'register' && 'Execute Registration'}
                                            {mode === 'forgot_password' && 'Execute Reset'}
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            <div className="mt-6 text-center text-mono text-sm text-muted">
                                {mode === 'login' && (
                                    <>
                                        No entity found?{' '}
                                        <button onClick={() => toggleMode('register')} className="text-accent hover:underline">
                                            Register
                                        </button>
                                    </>
                                )}
                                {mode === 'register' && (
                                    <>
                                        Entity exists?{' '}
                                        <button onClick={() => toggleMode('login')} className="text-accent hover:underline">
                                            Authenticate
                                        </button>
                                    </>
                                )}
                                {mode === 'forgot_password' && (
                                    <>
                                        Recall key?{' '}
                                        <button onClick={() => toggleMode('login')} className="text-accent hover:underline">
                                            Authenticate
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
