import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

export default function SettingsPage() {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            await authAPI.updateProfile({ name });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            <div style={{ padding: 'var(--space-8)', maxWidth: '600px' }}>
                <div className="page-header">
                    <h1 className="page-title text-gradient">Settings</h1>
                    <p className="page-subtitle">Manage your account preferences</p>
                </div>

                <div className="card">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User size={20} style={{ color: 'var(--primary-400)' }} />
                        Profile Information
                    </h2>

                    {message && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="label">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="input input-simple"
                                style={{ opacity: 0.6 }}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>Email cannot be changed</p>
                        </div>

                        <div className="mb-6">
                            <label className="label">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input input-simple"
                                placeholder="Your name"
                                required
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary"
                        >
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>

                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <h2 className="text-lg font-semibold mb-4">Account Info</h2>
                    <div className="text-sm">
                        <div className="flex justify-between py-3" style={{ borderBottom: '1px solid var(--gray-800)' }}>
                            <span style={{ color: 'var(--gray-400)' }}>Member since</span>
                            <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                        </div>
                        <div className="flex justify-between py-3">
                            <span style={{ color: 'var(--gray-400)' }}>Account ID</span>
                            <span className="font-mono text-xs">{user?._id || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
