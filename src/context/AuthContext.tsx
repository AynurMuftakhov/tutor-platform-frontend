import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { initKeycloak, keycloak } from "../services/keycloak";
import { fetchCurrentUser } from "../services/api";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    keycloakId: string;
    isOnboarded?: boolean;
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    setToken: (token: string | null) => void;
    logout: () => void;
    updateUser: (updatedUser: Partial<User>) => void;
    authenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(
        localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null
    );
    const [authenticated, setAuthenticated] = useState<boolean>(!!token);

    const saveToken = async (newToken: string | null) => {
        if (newToken) {
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setAuthenticated(true);

            try {
                const me = await fetchCurrentUser();
                setUser(me);
                localStorage.setItem('user', JSON.stringify(me));
            } catch (error) {
                console.error("Failed to fetch current user:", error);
            }
        } else {
            localStorage.clear();
            setToken(null);
            setUser(null);
            setAuthenticated(false);
        }
    };

    const logout = useCallback(() => {
        saveToken(null).finally(() => {
            if (keycloak.authenticated) {
                keycloak.logout({ redirectUri: window.location.origin + '/profile' });
            } else {
                window.location.href = '/profile';
            }
        });
    }, []);

    const updateUser = (updatedUser: Partial<User>) => {
        if (!user) return;
        const newUser = { ...user, ...updatedUser } as User;
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { authenticated, keycloak } = await initKeycloak();
                if (authenticated && keycloak.token) {
                    await saveToken(keycloak.token);
                }

                keycloak.onAuthSuccess = () => {
                    saveToken(keycloak.token);
                };

                console.log('Keycloak authenticated:', authenticated);
            } catch (error) {
                console.error('Keycloak initialization failed', error);
            }
        };
        initializeAuth();
    }, []);

    useEffect(() => {
        if (token) {
            try {
                const { exp } = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = exp * 1000 - Date.now();

                if (expirationTime > 0) {
                    const timeout = setTimeout(() => {
                        logout();
                    }, expirationTime);

                    return () => clearTimeout(timeout);
                } else {
                    logout();
                }
            } catch (error) {
                console.error('Invalid token:', error);
                logout();
            }
        }
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{ token, user, authenticated, setToken: saveToken, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};