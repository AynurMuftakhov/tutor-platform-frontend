import Keycloak from 'keycloak-js';

let keycloak = new Keycloak({
    url: 'http://localhost:7080/',
    realm: 'tutor-platform',
    clientId: 'tutor-platform-frontend'
});

let hasInit = false;

export function initKeycloak() {
    if (!hasInit) {
        hasInit = true;
        return keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256' }).then((authenticated) => {
            return { authenticated, keycloak };
        });
    } else {
        return Promise.resolve({ authenticated: keycloak.authenticated || false, keycloak });
    }
}

export { keycloak };