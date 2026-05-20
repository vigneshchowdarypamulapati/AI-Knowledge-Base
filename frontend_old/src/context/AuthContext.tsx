import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI } from '../utils/api';

interface UserSettings {
    topK: number;
    similarityThreshold: number;
    useHyDE: boolean;
    streamingEnabled: boolean;
    chunkStrategy: string;
    model: string;
}

interface User {
    _id: string;
    email: string;
    name: string;
    createdAt: string;
    settings?: UserSettings;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        if (!localStorage.getItem('token')) return;
        try {
            const response = await authAPI.getMe();
            setUser(response.data.data.user);
        } catch {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            if (token) await fetchUser();
            setIsLoading(false);
        };
        initAuth();
    }, [token, fetchUser]);

    const login = async (email: string, password: string) => {
        const response = await authAPI.login({ email, password });
        const { user: u, token: t } = response.data.data;
        localStorage.setItem('token', t);
        setToken(t);
        setUser(u);
    };

    const register = async (email: string, password: string, name: string) => {
        const response = await authAPI.register({ email, password, name });
        const { user: u, token: t } = response.data.data;
        localStorage.setItem('token', t);
        setToken(t);
        setUser(u);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    // Exposed so Settings page can refresh user after updating settings
    const refreshUser = useCallback(async () => {
        await fetchUser();
    }, [fetchUser]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
