import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import DocumentSidebar from './DocumentSidebar';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Only show document sidebar on chat page
    const showDocumentSidebar = location.pathname === '/chat';

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Navigation Sidebar - Fixed */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="main-content" style={{
                marginRight: showDocumentSidebar ? '300px' : '0',
                height: '100vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {children}
            </main>

            {/* Right Document Sidebar - Fixed */}
            {showDocumentSidebar && (
                <aside style={{
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    width: '300px',
                    height: '100vh',
                    background: 'var(--gray-900)',
                    borderLeft: '1px solid var(--gray-800)',
                    zIndex: 50
                }}>
                    <DocumentSidebar />
                </aside>
            )}
        </div>
    );
}
