// @ts-expect-error – keycloak-js v23 has no shipped types yet
import Keycloak from 'keycloak-js';

/** Singleton Keycloak instance */
export const keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

/**
 * Initialise Keycloak once and memoise the promise.
 * If the user explicitly logged out (flag in localStorage)
 * we force an interactive login (`login-required`) exactly once.
 */
export const initKeycloak = (() => {
    let once: Promise<boolean> | null = null;

    return (): Promise<boolean> => {
        const forceLogin = localStorage.getItem('user-initiated-logout') === 'true';

        // Re-use the existing promise unless we require a fresh interactive login
        if (once && !forceLogin) return once;

        if (forceLogin) {
            // remove the flag so next visits go back to silent mode
            localStorage.removeItem('user-initiated-logout');
        }

        return once = keycloak.init({
            onLoad: forceLogin ? 'login-required' : 'check-sso',
            silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            pkceMethod: 'S256',
            checkLoginIframe: true,  // light 5-s heartbeat
            flow: 'standard',
        });
    };
})();