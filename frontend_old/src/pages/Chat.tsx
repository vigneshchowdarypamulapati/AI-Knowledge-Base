import { useEffect } from 'react';
import Layout from '../components/Layout';
import ChatWindow from '../components/ChatWindow';
import { useDocuments } from '../context/DocumentContext';

export default function ChatPage() {
    const { fetchDocuments } = useDocuments();

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    return (
        <Layout>
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <ChatWindow />
            </div>
        </Layout>
    );
}
