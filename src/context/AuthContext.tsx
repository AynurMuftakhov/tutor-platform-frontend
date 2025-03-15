import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from "../services/api.ts";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    setToken: (token: string | null) => void;
    logout: () => void;
    updateUser: (updatedUser: Partial<User>) => void; // New function to update user
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(
        localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null
    );

    const saveToken = async (newToken: string | null) => {
        if (newToken) {
            localStorage.setItem('token', newToken);
            setToken(newToken);

            try {
                const response = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${newToken}` },
                });
                setUser(response.data);
                localStorage.setItem('user', JSON.stringify(response.data));
            } catch (error) {
                console.error('Error fetching user details:', error);
                logout();
            }
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        }
    };

    const logout = useCallback(() => {
        saveToken(null);
    }, []);

    const updateUser = (updatedUser: Partial<User>) => {
        const newUser = { ...user, ...updatedUser } as User;
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

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
        <AuthContext.Provider value={{ token, user, setToken: saveToken, logout, updateUser }}>
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
