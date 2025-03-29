//@ts-ignore
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: 'http://localhost:7080/',
    realm: 'tutor-platform',
    clientId: 'tutor-platform-frontend'
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