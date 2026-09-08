import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CognitoAuthService, CognitoUser } from "@/services/CognitoAuthService";
import { resetStore } from "@/store";

export interface User extends CognitoUser {}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (tokenOrEmail: string, passwordOrUserData?: any) => Promise<void> | void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check existing Cognito session
        const session = CognitoAuthService.getSession();
        if (session?.user) {
            // Check if token expired or needs refresh
            if (session.expiresAt < Date.now()) {
                CognitoAuthService.refreshSession()
                    .then((refreshed) => {
                        setUser(refreshed?.user || null);
                    })
                    .catch(() => {
                        setUser(null);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            } else {
                setUser(session.user);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (tokenOrEmail: string, passwordOrUserData?: any) => {
        if (typeof passwordOrUserData === 'string') {
            // Standard email + password login via Amazon Cognito
            const session = await CognitoAuthService.signIn(tokenOrEmail, passwordOrUserData);
            setUser(session.user);
        } else if (passwordOrUserData && typeof passwordOrUserData === 'object') {
            // Compatibility setter
            setUser(passwordOrUserData);
        }
    };

    const logout = async () => {
        await CognitoAuthService.signOut();
        resetStore();
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
