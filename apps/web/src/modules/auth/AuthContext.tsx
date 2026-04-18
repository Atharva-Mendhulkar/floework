import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { resetStore } from "@/store";

interface User {
    id: string;
    email: string;
    name: string;
    role: "admin" | "member";
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(su: SupabaseUser): User {
    return {
        id: su.id,
        email: su.email || "",
        name: su.user_metadata?.full_name || su.email?.split("@")[0] || "User",
        role: "admin",
        avatarUrl: su.user_metadata?.avatar_url,
    };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check existing session
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                setUser(mapSupabaseUser(data.session.user));
            }
            setIsLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUser(mapSupabaseUser(session.user));
            } else {
                setUser(null);
                if (event === 'SIGNED_OUT') {
                    resetStore();
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = (_token: string, userData: User) => {
        // Kept for compatibility — Supabase handles session persistence internally
        setUser(userData);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        resetStore(); // Explicit reset
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
