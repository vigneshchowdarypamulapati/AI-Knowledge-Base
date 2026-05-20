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
            <div style={{ padding: 'var(--space-8)', maxWidth: '1200px', margin: '0 auto' }}>
                <div className="page-header flex justify-between items-end mb-8 border-b border-strong pb-4">
                    <div>
                        <h1 className="editorial-heading mb-0" style={{ fontSize: '4rem' }}>Databanks.</h1>
                        <p className="text-mono text-muted uppercase tracking-widest text-sm mt-2">
                            Upload and manage your knowledge base
                        </p>
                    </div>
                    <button
                        onClick={fetchDocuments}
                        className="btn btn-secondary"
                        disabled={isLoading}
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        SYNC
                    </button>
                </div>

                {/* Upload Section */}
                <div className="mb-10">
                    <DocumentUpload />
                </div>

                {/* Selection Actions */}
                {documents.length > 0 && (
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={selectedDocuments.length === documents.filter(d => d.status === 'embedded').length ? clearSelection : selectAllDocuments}
                            className="text-mono text-xs uppercase tracking-widest text-accent hover:underline"
                        >
                            {selectedDocuments.length === documents.filter(d => d.status === 'embedded').length
                                ? '[ DESELECT ALL ]'
                                : '[ SELECT ALL READY ]'}
                        </button>
                        {selectedDocuments.length > 0 && (
                            <span className="text-mono text-xs uppercase tracking-widest text-muted border border-border-strong px-2 py-1">
                                {selectedDocuments.length} SELECTED
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
                            <div className="flex items-start gap-4">
                                <div className="text-accent">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-serif text-lg truncate mb-2">{doc.originalName}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="text-mono text-xs uppercase tracking-widest">
                                            {getStatusBadge(doc.status)}
                                        </div>
                                        {doc.chunkCount > 0 && (
                                            <span className="text-mono text-xs text-muted uppercase tracking-widest border border-border-strong px-1">
                                                {doc.chunkCount} CHUNKS
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 mt-4 text-mono text-xs text-muted uppercase tracking-widest">
                                        <span>SIZE: {formatSize(doc.size)}</span>
                                        <span>DATE: {formatDate(doc.createdAt)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDocument(doc._id);
                                    }}
                                    className="btn-ghost"
                                    title="Delete"
                                    style={{ padding: '4px', alignSelf: 'flex-start' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {doc.error && (
                                <div className="mt-4 text-mono text-xs uppercase tracking-widest p-2 border border-error text-error">
                                    [ERROR]: {doc.error}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {documents.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center p-10 border border-border-strong mt-10">
                        <div className="text-muted mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-serif text-2xl mb-2 text-muted">No databanks found</h3>
                        <p className="text-mono text-xs uppercase tracking-widest text-muted">Initialize the system by uploading a document.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
