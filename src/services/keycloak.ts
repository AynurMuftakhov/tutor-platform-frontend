//@ts-ignore
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: process.env.REACT_APP_KEYCLOAK_URL,
    realm: process.env.REACT_APP_KEYCLOAK_REALM,
    clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
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