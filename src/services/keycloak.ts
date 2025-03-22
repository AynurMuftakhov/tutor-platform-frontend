import Keycloak from 'keycloak-js';

let keycloak = new Keycloak({
    url: 'http://localhost:7080/',
    realm: 'tutor-platform',
    clientId: 'tutor-platform-frontend'
});

// Optional boolean to track whether we've already run init
let hasInit = false;

export function initKeycloak() {
    if (!hasInit) {
        hasInit = true;
        return keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256' });
    } else {
        // Already initted (or in progress).
        // Return a resolved promise with the existing `authenticated` status
        return Promise.resolve(keycloak.authenticated || false);
    }
}

export { keycloak };