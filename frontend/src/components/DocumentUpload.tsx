import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';

interface UploadItem {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    message: string;
}

export default function DocumentUpload() {
    const { uploadDocument } = useDocuments();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await handleUploadMultiple(files);
        }
    }, []);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await handleUploadMultiple(Array.from(files));
        }
        e.target.value = '';
    }, []);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Invalid file type. Only PDF, TXT, and DOCX are allowed.' };
        }

        if (file.size > 10 * 1024 * 1024) {
            return { valid: false, error: 'File too large. Maximum size is 10MB.' };
        }

        return { valid: true };
    };

    const handleUploadMultiple = async (files: File[]) => {
        // Create queue items
        const queueItems: UploadItem[] = files.map((file, index) => ({
            id: `${Date.now()}-${index}`,
            file,
            status: 'pending' as const,
            message: 'Waiting...'
        }));

        setUploadQueue(queueItems);
        setIsUploading(true);

        // Process files sequentially
        for (let i = 0; i < queueItems.length; i++) {
            const item = queueItems[i];
            
            // Update status to uploading
            setUploadQueue(prev => prev.map(q => 
                q.id === item.id ? { ...q, status: 'uploading', message: 'Uploading...' } : q
            ));

            // Validate file
            const validation = validateFile(item.file);
            if (!validation.valid) {
                setUploadQueue(prev => prev.map(q => 
                    q.id === item.id ? { ...q, status: 'error', message: validation.error! } : q
                ));
                continue;
            }

            // Upload file
            try {
                await uploadDocument(item.file);
                setUploadQueue(prev => prev.map(q => 
                    q.id === item.id ? { ...q, status: 'success', message: 'Uploaded!' } : q
                ));
            } catch (error: unknown) {
                console.error('Upload error:', error);
                let message = 'Upload failed.';

                if (error && typeof error === 'object') {
                    const axiosError = error as {
                        response?: { data?: { message?: string } };
                        code?: string;
                        message?: string;
                    };

                    if (axiosError.code === 'ECONNABORTED') {
                        message = 'Upload timed out.';
                    } else if (axiosError.response?.data?.message) {
                        message = axiosError.response.data.message;
                    } else if (axiosError.message) {
                        message = axiosError.message;
                    }
                }

                setUploadQueue(prev => prev.map(q => 
                    q.id === item.id ? { ...q, status: 'error', message } : q
                ));
            }
        }

        setIsUploading(false);

        // Clear queue after 5 seconds if all succeeded
        const allSuccess = queueItems.every(item => {
            const current = uploadQueue.find(q => q.id === item.id);
            return current?.status === 'success';
        });

        if (allSuccess) {
            setTimeout(() => setUploadQueue([]), 5000);
        }
    };

    const clearQueue = () => {
        if (!isUploading) {
            setUploadQueue([]);
        }
    };

    return (
        <div className="w-full">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            >
                <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    multiple
                    onChange={handleFileSelect}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                    }}
                />

                <div className="upload-icon">
                    <Upload size={28} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
                <p style={{ color: 'var(--gray-400)' }} className="text-sm mb-4">
                    Drag and drop multiple files or click to browse
                </p>
                <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--gray-500)' }}>
                    <span className="flex items-center gap-1">
                        <FileText size={14} /> PDF
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText size={14} /> TXT
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText size={14} /> DOCX
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {uploadQueue.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 space-y-2"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--gray-300)' }}>
                                {isUploading ? 'Uploading...' : 'Upload Complete'}
                            </span>
                            {!isUploading && (
                                <button
                                    onClick={clearQueue}
                                    className="text-xs btn-ghost px-2 py-1"
                                    style={{ color: 'var(--gray-500)' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {uploadQueue.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 p-3 rounded-lg"
                                style={{ background: 'var(--gray-800)' }}
                            >
                                {item.status === 'pending' && (
                                    <div className="w-5 h-5 rounded-full" style={{ background: 'var(--gray-600)' }} />
                                )}
                                {item.status === 'uploading' && (
                                    <Loader2 size={18} className="animate-spin" style={{ color: 'var(--primary-400)' }} />
                                )}
                                {item.status === 'success' && (
                                    <Check size={18} style={{ color: 'var(--success)' }} />
                                )}
                                {item.status === 'error' && (
                                    <AlertCircle size={18} style={{ color: 'var(--error)' }} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate" style={{ color: 'var(--gray-200)' }}>
                                        {item.file.name}
                                    </p>
                                    <p className="text-xs" style={{ 
                                        color: item.status === 'error' ? 'var(--error)' : 
                                               item.status === 'success' ? 'var(--success)' : 'var(--gray-500)' 
                                    }}>
                                        {item.message}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
