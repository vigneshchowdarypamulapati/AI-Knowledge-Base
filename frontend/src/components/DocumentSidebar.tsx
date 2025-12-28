import { motion } from 'framer-motion';
import { FileText, Check, Search, Trash2 } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DocumentSidebar() {
    const { documents, selectedDocuments, toggleDocumentSelection, deleteDocument } = useDocuments();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredDocuments = documents.filter(doc =>
        doc.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (e: React.MouseEvent, docId: string, docName: string) => {
        e.stopPropagation(); // Prevent toggling selection

        const confirmed = window.confirm(`Delete "${docName}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await deleteDocument(docId);
            toast.success(`Deleted ${docName}`);
        } catch (error) {
            toast.error('Failed to delete document');
        }
    };

    return (
        <aside className="document-sidebar" style={{
            width: '300px',
            borderLeft: '1px solid var(--gray-800)',
            background: 'var(--gray-900)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-800)' }}>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-primary-500" />
                    Context Documents
                </h3>

                {/* Search */}
                <div className="input-group">
                    <Search size={16} className="input-icon" style={{ left: '12px' }} />
                    <input
                        type="text"
                        placeholder="Filter documents..."
                        className="input"
                        style={{ paddingLeft: '36px', fontSize: '0.875rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
                {filteredDocuments.length === 0 ? (
                    <div className="text-center p-6" style={{ color: 'var(--gray-500)' }}>
                        <p className="text-sm">No documents found.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredDocuments.map((doc) => {
                            const isSelected = selectedDocuments.includes(doc._id);
                            return (
                                <motion.div
                                    key={doc._id}
                                    whileHover={{ backgroundColor: 'var(--gray-800)' }}
                                    onClick={() => toggleDocumentSelection(doc._id)}
                                    style={{
                                        padding: 'var(--space-3)',
                                        borderRadius: 'var(--radius-lg)',
                                        cursor: 'pointer',
                                        border: `1px solid ${isSelected ? 'var(--primary-500)' : 'transparent'}`,
                                        background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)'
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px',
                                        border: `2px solid ${isSelected ? 'var(--primary-500)' : 'var(--gray-600)'}`,
                                        background: isSelected ? 'var(--primary-500)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {isSelected && <Check size={14} color="white" />}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p className="text-sm font-medium truncate" style={{
                                            color: isSelected ? 'white' : 'var(--gray-300)'
                                        }}>
                                            {doc.originalName}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: 'var(--gray-500)' }}>
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>

                                    {/* Delete Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.1, color: 'var(--error)' }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => handleDelete(e, doc._id, doc.originalName)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            color: 'var(--gray-500)',
                                            borderRadius: '4px'
                                        }}
                                        title="Delete document"
                                    >
                                        <Trash2 size={16} />
                                    </motion.button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{
                padding: 'var(--space-4)',
                borderTop: '1px solid var(--gray-800)',
                fontSize: '0.75rem',
                color: 'var(--gray-500)',
                textAlign: 'center'
            }}>
                {selectedDocuments.length} selected
            </div>
        </aside>
    );
}
