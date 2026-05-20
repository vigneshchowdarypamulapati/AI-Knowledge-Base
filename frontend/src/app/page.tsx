"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

type AuthState = "login" | "register" | "forgot_password";

export default function AuthPage() {
    const { login, register, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [authState, setAuthState] = useState<AuthState>("login");
    const [loading, setLoading] = useState(false);

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || isAuthenticated) return null; // Prevent flash

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (authState === "login") {
                await login(email, password);
                toast.success("Authentication successful");
            } else if (authState === "register") {
                await register(email, password, name);
                toast.success("Account created successfully");
            } else if (authState === "forgot_password") {
                // In a real app, this would send an email. For demo purposes, we call reset API.
                // Assuming the backend reset requires email and new password directly for now.
                const { authAPI } = await import("@/utils/api");
                await authAPI.resetPassword({ email, newPassword: password });
                toast.success("Password reset successfully. Please log in.");
                setAuthState("login");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-obsidian text-foreground overflow-hidden font-sans">
            {/* Left Side: Intelligent Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="mb-12">
                            <h1 className="font-serif text-5xl tracking-tight text-white mb-4">
                                {authState === "login" && "System.Auth"}
                                {authState === "register" && "System.Init"}
                                {authState === "forgot_password" && "System.Reset"}
                            </h1>
                            <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest">
                                Category-Defining Document Intelligence
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {authState === "register" && (
                                    <motion.div
                                        key="name-field"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Subject Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                className="w-full bg-transparent border-b border-white/10 py-3 text-white placeholder-neutral-700 focus:outline-none focus:border-white/50 transition-colors font-mono text-sm"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Identifier (Email)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-b border-white/10 py-3 text-white placeholder-neutral-700 focus:outline-none focus:border-white/50 transition-colors font-mono text-sm"
                                    placeholder="user@domain.com"
                                />
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                    {authState === "forgot_password" ? "New Security Key" : "Security Key"}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-b border-white/10 py-3 text-white placeholder-neutral-700 focus:outline-none focus:border-white/50 transition-colors font-mono text-sm"
                                    placeholder="••••••••"
                                />
                                {authState === "login" && (
                                    <button
                                        type="button"
                                        onClick={() => setAuthState("forgot_password")}
                                        className="absolute right-0 top-0 text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <KeyRound size={10} /> Reset
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-8 bg-white text-black font-medium py-3 rounded-none flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        {authState === "login" && "Execute Login"}
                                        {authState === "register" && "Initialize Profile"}
                                        {authState === "forgot_password" && "Confirm Reset"}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 text-center">
                            <button
                                onClick={() => setAuthState(authState === "login" ? "register" : "login")}
                                className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
                            >
                                {authState === "login" ? "Create new identifier" : "Return to login protocol"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side: Visual/Abstract */}
            <div className="hidden lg:flex w-1/2 relative bg-obsidian-light border-l border-white/5 overflow-hidden items-center justify-center">
                {/* Abstract orbital / geometric background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-obsidian to-obsidian" />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="relative z-10 max-w-lg p-12 text-center"
                >
                    <div className="w-32 h-32 border border-white/10 rounded-full mx-auto mb-8 flex items-center justify-center relative">
                        <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
                        <div className="w-16 h-16 bg-white/10 rounded-full blur-xl" />
                        <div className="w-2 h-2 bg-white rounded-full absolute" />
                    </div>
                    
                    <h2 className="font-serif text-3xl text-neutral-300 italic mb-4">
                        "The interface is the intelligence."
                    </h2>
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest leading-loose">
                        Semantic vectors · Contextual retrieval · Immutable citations
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
