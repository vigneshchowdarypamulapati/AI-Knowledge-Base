import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import DocumentUpload from '../components/DocumentUpload';
import { useDocuments } from '../context/DocumentContext';

export default function DocumentsPage() {
    const {
        documents,
        isLoading,
        selectedDocuments,
        fetchDocuments,
        deleteDocument,
        toggleDocumentSelection,
        selectAllDocuments,
        clearSelection
    } = useDocuments();

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'embedded':
                return (
                    <span className="status-badge status-embedded">
                        <CheckCircle size={12} /> Ready
                    </span>
                );
            case 'processing':
                return (
                    <span className="status-badge status-processing">
                        <Clock size={12} /> Processing
                    </span>
                );
            case 'error':
                return (
                    <span className="status-badge status-error">
                        <AlertCircle size={12} /> Error
                    </span>
                );
            default:
                return (
                    <span className="status-badge" style={{ background: 'var(--gray-800)', color: 'var(--gray-400)' }}>
                        <Clock size={12} /> Uploaded
                    </span>
                );
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Layout>
            <div style={{ padding: 'var(--space-8)', maxWidth: '1200px' }}>
                <div className="page-header flex justify-between items-center">
                    <div>
                        <h1 className="page-title text-gradient">Documents</h1>
                        <p className="page-subtitle">Upload and manage your knowledge base</p>
                    </div>
                    <button
                        onClick={fetchDocuments}
                        className="btn btn-secondary"
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Upload Section */}
                <div className="mb-8">
                    <DocumentUpload />
                </div>

                {/* Selection Actions */}
                {documents.length > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={selectedDocuments.length === documents.filter(d => d.status === 'embedded').length ? clearSelection : selectAllDocuments}
                            className="text-sm font-medium"
                            style={{ color: 'var(--primary-400)' }}
                        >
                            {selectedDocuments.length === documents.filter(d => d.status === 'embedded').length
                                ? 'Deselect All'
                                : 'Select All Ready'}
                        </button>
                        {selectedDocuments.length > 0 && (
                            <span className="text-sm" style={{ color: 'var(--gray-400)' }}>
                                {selectedDocuments.length} selected for chat
                            </span>
                        )}
                    </div>
                )}

                {/* Document Grid */}
                <div className="document-grid">
                    {documents.map((doc, index) => (
                        <motion.div
                            key={doc._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => doc.status === 'embedded' && toggleDocumentSelection(doc._id)}
                            className={`document-card ${selectedDocuments.includes(doc._id) ? 'selected' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="document-icon">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1" style={{ minWidth: 0 }}>
                                    <h3 className="font-medium truncate">{doc.originalName}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        {getStatusBadge(doc.status)}
                                        {doc.chunkCount > 0 && (
                                            <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                                {doc.chunkCount} chunks
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--gray-500)' }}>
                                        <span>{formatSize(doc.size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(doc.createdAt)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDocument(doc._id);
                                    }}
                                    className="btn-ghost"
                                    title="Delete"
                                    style={{ color: 'var(--gray-400)' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {doc.error && (
                                <p className="mt-2 text-xs" style={{ color: 'var(--error)' }}>{doc.error}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                {documents.length === 0 && !isLoading && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                        <p style={{ color: 'var(--gray-400)' }}>Upload your first document to get started</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
