import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { initKeycloak, keycloak } from '../services/keycloak';
import { fetchCurrentUser } from '../services/api';
import { activityEmitter } from '../services/tracking/activityEmitter';

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
    authenticated: boolean;
    isLoading: boolean;
    setToken: (t: string | null) => void;
    logout: () => void;
    updateUser: (u: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
                                                                          children,
                                                                      }) => {
    /** keep the token only for the lifetime of the tab */
    const [token, setTokenState] = useState<string | null>(
        sessionStorage.getItem('token'),
    );
    const [user, setUser] = useState<User | null>(
        sessionStorage.getItem('user')
            ? JSON.parse(sessionStorage.getItem('user')!)
            : null,
    );
    const [authenticated, setAuthenticated] = useState<boolean>(!!token);
    const [isLoading, setIsLoading] = useState(true);

    /** single timeout id for scheduled refresh */
    const refreshTimeout = useRef<number>(null);

    const saveToken = useCallback(
        async (newToken: string | null) => {
            if (newToken) {
                sessionStorage.setItem('token', newToken);
                setTokenState(newToken);
                setAuthenticated(true);
                try { activityEmitter.setToken(newToken); } catch {}

                try {
                    const me = await fetchCurrentUser();
                    setUser(me);
                    sessionStorage.setItem('user', JSON.stringify(me));
                    // Start activity tracking only for students
                    try {
                        const role = (me?.role || '').toLowerCase();
                        if (role === 'student') {
                            activityEmitter.start(me.id, newToken);
                        } else {
                            activityEmitter.stop();
                        }
                    } catch {}
                } catch (err) {
                    console.error('fetchCurrentUser failed', err);
                }
            } else {
                sessionStorage.clear();
                setTokenState(null);
                setUser(null);
                setAuthenticated(false);
                try { activityEmitter.stop(); } catch {}
            }
        },
        [setTokenState],
    );

    const logout = useCallback(() => {
        // mark explicit logout for next app load
        localStorage.setItem('user-initiated-logout', 'true');

        saveToken(null);

        // server-side SSO logout
        keycloak.logout({
            redirectUri: window.location.origin + '/',
            idTokenHint: keycloak.idToken,
        });
    }, [saveToken]);


    const scheduleRefresh = useCallback(() => {
        // clear previous timer
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);

        const exp = keycloak.tokenParsed?.exp;
        if (!exp) return;

        // time until expiry minus 60 s safety buffer
        const delay = Math.max(exp * 1000 - Date.now() - 60_000, 10_000);

        refreshTimeout.current = window.setTimeout(async () => {
            try {
                const refreshed = await keycloak.updateToken(0);
                if (refreshed && keycloak.token) saveToken(keycloak.token);
                scheduleRefresh(); // recurse for the next cycle
            } catch (err) {
                console.error('token refresh failed', err);
                saveToken(null);
            }
        }, delay);
    }, [saveToken]);

    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            try {
                const ok = await initKeycloak();
                if (cancelled) return;

                setAuthenticated(ok);
                if (ok && keycloak.token) {
                    await saveToken(keycloak.token);
                    scheduleRefresh();
                }

                // Keycloak events
                keycloak.onAuthSuccess = () => {
                    saveToken(keycloak.token);
                    scheduleRefresh();
                };
                keycloak.onTokenExpired = () => scheduleRefresh();
            } catch (err) {
                console.error('Keycloak init failed', err);
                saveToken(null);
                setAuthenticated(false);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        bootstrap();
        return () => {
            cancelled = true;
            if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
            // detach listeners
            keycloak.onAuthSuccess = undefined;
            keycloak.onTokenExpired = undefined;
        };
    }, [saveToken, scheduleRefresh]);

    /* ---------------- update user helper ---------------- */

    const updateUser = (partial: Partial<User>) => {
        if (!user) return;
        const merged = { ...user, ...partial };
        setUser(merged);
        sessionStorage.setItem('user', JSON.stringify(merged));
    };

    /* ---------------- provider ---------------- */

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                authenticated,
                isLoading,
                setToken: saveToken,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
    return ctx;
};