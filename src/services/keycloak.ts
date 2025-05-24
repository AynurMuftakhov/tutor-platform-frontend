//@ts-ignore
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
            onLoad: 'login-required',
            pkceMethod: 'S256'
        });

        return { authenticated, keycloak };
    } else {
        return { authenticated: keycloak.authenticated || false, keycloak };
    }
}

export { keycloak };
