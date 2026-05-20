"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { documentsAPI } from '../utils/api';

interface Document {
    _id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    status: 'uploaded' | 'processing' | 'embedded' | 'error';
    chunkCount: number;
    createdAt: string;
    error?: string;
}

interface DocumentContextType {
    documents: Document[];
    isLoading: boolean;
    selectedDocuments: string[];
    fetchDocuments: () => Promise<void>;
    uploadDocument: (file: File) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    toggleDocumentSelection: (id: string) => void;
    selectAllDocuments: () => void;
    clearSelection: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await documentsAPI.getAll();
            setDocuments(response.data.data.documents);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadDocument = useCallback(async (file: File) => {
        const response = await documentsAPI.upload(file);
        setDocuments(prev => [response.data.data.document, ...prev]);
    }, []);

    const deleteDocument = useCallback(async (id: string) => {
        await documentsAPI.delete(id);
        setDocuments(prev => prev.filter(doc => doc._id !== id));
        setSelectedDocuments(prev => prev.filter(docId => docId !== id));
    }, []);

    const toggleDocumentSelection = useCallback((id: string) => {
        setSelectedDocuments(prev =>
            prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
        );
    }, []);

    const selectAllDocuments = useCallback(() => {
        const embeddedDocs = documents.filter(doc => doc.status === 'embedded');
        setSelectedDocuments(embeddedDocs.map(doc => doc._id));
    }, [documents]);

    const clearSelection = useCallback(() => {
        setSelectedDocuments([]);
    }, []);

    return (
        <DocumentContext.Provider
            value={{
                documents,
                isLoading,
                selectedDocuments,
                fetchDocuments,
                uploadDocument,
                deleteDocument,
                toggleDocumentSelection,
                selectAllDocuments,
                clearSelection
            }}
        >
            {children}
        </DocumentContext.Provider>
    );
}

export function useDocuments() {
    const context = useContext(DocumentContext);
    if (context === undefined) {
        throw new Error('useDocuments must be used within a DocumentProvider');
    }
    return context;
}
