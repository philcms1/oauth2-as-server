/* eslint-disable no-unused-vars,no-param-reassign */
/**
 * Crafted in Erebor by thorin on 2017-11-28
 */
const meta = require('./package');

exports.register = (server, options, next) => {
    // *********************************
    // DB MOCK CODE
    // *********************************
    const dcrClient = {
        client_name: 'restlet_client_5327',
        response_type: 'token',
        token_endpoint_auth_method: 'client_secret_basic',
        client_id: '9WBlEWnkLSwkcsTXI97bHfhx5joxleogWyK',
        client_secret: 't6nadULs7u3hLDDmC2JzCuQJEFCxxRMthXMIF57OJhGTXm9nM4',
        client_id_created_at: 1513791723,
        client_secret_expires_at: 0,
        isActive: true,
        grant_types: [ 'client_credentials' ],
        redirect_uris: [ 'http://localhost:1234/dummy' ]
    };

    server.app.db = {
        saveClient: () => new Promise((resolve, reject) => resolve(dcrClient))
    };
    /* server.app.oauthOptions = {
        jwt: {
            exp: 315576000 // 10 years in seconds
        },
        dcr: {
            clientIdLength: 35,
            clientSecretLength: 50,
            defaultGrantType: 'authorization_code',
            defaultResponseType: 'code',
            defaultTokenEndpointAuthMethod: 'client_secret_basic',
            clientSecretExpiration: 0
        }
    }; */
    next();
};

exports.register.attributes = {
    pkg: meta
};