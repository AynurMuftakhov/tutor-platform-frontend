import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {getInitialToken, initKeycloak, keycloak} from "../services/keycloak";
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
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const initialToken = getInitialToken();
    const initialUser = initialToken && localStorage.getItem('user')
        ? JSON.parse(localStorage.getItem('user') as string)
        : null;

    const [token, setToken] = useState<string | null>(initialToken);
    const [user, setUser] = useState<User | null>(initialUser);
    const [authenticated, setAuthenticated] = useState<boolean>(!!token);
    const [isLoading, setIsLoading] = useState<boolean>(true);

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
                keycloak.logout({ redirectUri: window.location.origin + '/' });
            } else {
                window.location.href = '/';
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

                keycloak.onTokenExpired = () => {
                    keycloak.updateToken(0).then((refreshed: boolean) => {
                        if (refreshed) {
                            saveToken(keycloak.token);
                        } else {
                            logout();
                        }
                    }).catch(() => {
                        logout();
                    });
                };

                console.log('Keycloak authenticated:', authenticated);
            } catch (error) {
                console.error('Keycloak initialization failed', error);
            } finally {
                setIsLoading(false);
            }
        };
        initializeAuth();
    }, []);

    useEffect(() => {
        if (!keycloak || !keycloak.tokenParsed?.exp) return;

        const refreshBuffer = 60; // seconds before expiry to refresh
        const expiresIn = keycloak.tokenParsed.exp * 1000 - Date.now();
        const refreshTime = expiresIn - refreshBuffer * 1000;

        if (refreshTime <= 0) {
            // Token already expired or about to — try refreshing immediately
            keycloak.updateToken(0).then((refreshed:boolean) => {
                if (refreshed) {
                    saveToken(keycloak.token);
                }
            }).catch(() => {
                logout();
            });
            return;
        }

        const timeout = setTimeout(() => {
            keycloak.updateToken(refreshBuffer).then((refreshed: boolean) => {
                if (refreshed) {
                    saveToken(keycloak.token);
                }
            }).catch(() => {
                logout();
            });
        }, refreshTime);

        return () => clearTimeout(timeout);
    }, [token, logout]);

    return (
        <AuthContext.Provider
            value={{ token, user, authenticated, setToken: saveToken, logout, updateUser, isLoading }}
        >
            {/* De‑fer rendering children until auth is resolved so no requests use an expired token */}
            {!isLoading && children}
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