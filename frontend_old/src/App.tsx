import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DocumentProvider } from './context/DocumentContext';
import { ChatProvider } from './context/ChatContext';
import LoginPage from './pages/Login';
import ChatPage from './pages/Chat';
import DocumentsPage from './pages/Documents';
import SettingsPage from './pages/Settings';
import AnalyticsPage from './pages/Analytics';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
          success: { iconTheme: { primary: 'var(--primary-400)', secondary: '#fff' } }
        }}
      />
      <AuthProvider>
        <DocumentProvider>
          <ChatProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </ChatProvider>
        </DocumentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
