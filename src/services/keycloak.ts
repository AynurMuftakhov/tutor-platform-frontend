//@ts-expect-error - Keycloak types may not be fully compatible with TypeScript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

let hasInit = false;

export async function initKeycloak() {
    if (!hasInit) {
        hasInit = true;

        const authenticated = await keycloak.init({
            onLoad: 'check-sso',
            pkceMethod: 'S256'
        });

        return { authenticated, keycloak };
    } else {
        return { authenticated: keycloak.authenticated || false, keycloak };
    }
}

/**
 * Decodes the JWT and returns `true` if the token is already expired.
 * Any parsing error is treated as an expired token for safety.
 */
export function isTokenExpired(token: string): boolean {
    try {
        const [, payload] = token.split('.');
        const { exp } = JSON.parse(atob(payload));
        return Date.now() >= exp * 1000;
    } catch {
        return true;
    }
}

/**
 * Reads the token from localStorage and validates its expiry.
 * If the token is missing or expired, local storage is cleared and `null`
 * is returned.
 */
export function getInitialToken(): string | null {
    const stored = localStorage.getItem('token');
    if (!stored) return null;

    if (isTokenExpired(stored)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
    }
    return stored;
}


export { keycloak };
