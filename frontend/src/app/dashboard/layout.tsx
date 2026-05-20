"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import KnowledgeMap from "@/components/dashboard/KnowledgeMap";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !isAuthenticated) return null;

    return (
        <div className="flex h-screen bg-obsidian text-foreground overflow-hidden">
            {/* Left Pane: Knowledge Map (Persistent) */}
            <KnowledgeMap />

            {/* Center Pane: Reasoning Engine (Dynamic based on route) */}
            <div className="flex-1 flex flex-col min-w-0 border-l border-white/10 bg-obsidian-light/50">
                {children}
            </div>
            
            {/* Note: The Right Pane (Proof Inspector) is managed within the ReasoningEngine (Chat) component 
                because it specifically reacts to chat citations. */}
        </div>
    );
}
