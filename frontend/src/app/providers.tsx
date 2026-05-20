"use client";

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { DocumentProvider } from '@/context/DocumentContext';
import { ChatProvider } from '@/context/ChatContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DocumentProvider>
                <ChatProvider>
                    {children}
                </ChatProvider>
            </DocumentProvider>
        </AuthProvider>
    );
}
