/**
 * Crafted in Erebor by thorin on 2018-05-14
 */
const { expect } = require('chai');
const chai = require('chai');
const assertArrays = require('chai-arrays');
const Glue = require('glue');
const Randomstring = require('randomstring');
const jsdom = require('jsdom');

const { JSDOM } = jsdom;
chai.use(assertArrays);

const Manifest = require('./resources/serverConfig');
const Options = require('./resources/oauthOptions');
const UrlUtils = require('../lib/modules/authServer/utils/url-utils');

// *************************************************
// Utility functions and variables
// *************************************************
let server;

const init = async () => {
    try {
        server = await Glue.compose(Manifest(9006), { relativeTo: `${ __dirname }/..` });

        server.app.oauthOptions = Options;

        await server.start();

        console.log(`Test server running at: ${ server.info.uri }`);
    } catch (error) {
        console.error(error);
    }
};

// *************************************************
// TESTING SUITE
// *************************************************
describe('Client Validation', () => {
    before(async () => {
        await init();
    });

    it('should display approval view for a valid client, and retain randomly generated state', async () => {
        const state = Randomstring.generate();
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=http://localhost:1234/dummy&response_type=code&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });
        // console.log(res.result);
        expect(res.statusCode).to.equal(200);
        expect(res.request.query).to.deep.equal({
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            response_type: 'code',
            state
        });
        const dom = new JSDOM(res.result);
        expect(dom.window.document.querySelector('form').querySelector('p').innerHTML)
            .to.have.string('v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU');
    });

    it('should process an array of redirect URIs', async () => {
        const state = Randomstring.generate();
        const urlParsed = UrlUtils.buildUrl('/oauth2/authorize', {
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: [ 'http://localhost:1234/dummy' ],
            response_type: 'code',
            scopes: 'foo',
            state
        });
        const res = await server.inject({
            method: 'GET',
            url: urlParsed,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
    });

    it('should accept an empty response type', async () => {
        const state = Randomstring.generate();
        const urlParsed = UrlUtils.buildUrl('/oauth2/authorize', {
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: [ 'http://localhost:1234/dummy' ],
            response_type: ' ',
            scopes: 'foo',
            state
        });
        const res = await server.inject({
            method: 'GET',
            url: urlParsed,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
    });

    it('should reject an invalid scope, and redirect with the error', async () => {
        const state = Randomstring.generate();
        const redirectUri = 'http://localhost:1234/dummy';
        const scope = 'foo bur';
        const errorMessage = 'Invalid scope(s) requested: foo,bur';
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=${ redirectUri }&response_type=code&scopes=${ scope }&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(302);
        expect(res.headers.location).to.equal(`${ redirectUri }?error=${ encodeURIComponent(errorMessage) }`);
    });

    it('should reject an invalid redirect URI, and redirect with the error to the saved URI', async () => {
        const state = Randomstring.generate();
        const incorrectRedirectUri = 'http://localhost:4567/incorrect';
        const correctRedirectUri = 'http://localhost:1234/dummy';
        const errorMessage = `Invalid redirect URI ${ incorrectRedirectUri }`;
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=${ incorrectRedirectUri }&response_type=code&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });

        expect(res.statusCode).to.equal(302);
        expect(res.headers.location).to.equal(`${ correctRedirectUri }?error=${ encodeURIComponent(errorMessage) }`);
        console.log(res.headers.location);
    });

    it('should reject an unknown client, and redirect with the error', async () => {
        const clientId = Randomstring.generate(100);
        const state = Randomstring.generate();
        const redirectUri = 'http://localhost:1234/dummy';
        const errorMessage = `No client found for ID ${ clientId }.`;
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=${ clientId }&redirect_uris=${ redirectUri }&response_type=code&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });

        expect(res.statusCode).to.equal(302);
        expect(res.headers.location).to.equal(`${ redirectUri }?error=${ encodeURIComponent(errorMessage) }`);
    });

    it('should reject POST request to approve a client with an invalid reqId', async () => {
        const state = Randomstring.generate();
        const incorrectReqId = Randomstring.generate();
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=http://localhost:1234/dummy&response_type=code&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
        expect(res.request.query).to.deep.equal({
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            response_type: 'code',
            state
        });
        // Extract the generated reqId
        const dom = new JSDOM(res.result);
        const reqId = dom.window.document.querySelector('input').getAttribute('value');
        expect(reqId).to.not.equal(incorrectReqId);

        const approvalRes = await server.inject({
            method: 'POST',
            url: '/oauth2/approve',
            payload: `reqId=${ incorrectReqId }&decision=approve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: { user: 'test' }
        });
        expect(approvalRes.statusCode).to.equal(500);
    });

    it('should generate a code for a valid client', async () => {
        const state = Randomstring.generate();
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=http://localhost:1234/dummy&response_type=code&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
        expect(res.request.query).to.deep.equal({
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            response_type: 'code',
            state
        });
        // Extract the generated reqId
        const dom = new JSDOM(res.result);
        const reqId = dom.window.document.querySelector('input').getAttribute('value');

        const approvalRes = await server.inject({
            method: 'POST',
            url: '/oauth2/approve',
            payload: `reqId=${ reqId }&decision=approve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: { user: 'test' }
        });
        // TODO: properly parse URL query parameters
        const respUrl = approvalRes.headers.location;
        const generatedCode = respUrl.split(/=(.+)/)[1].split('&')[0];
        const Models = server.app.db;
        const codeObject = await Models.findCodeByValue(generatedCode);
        expect(codeObject.client_id).to.equal('v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU');
        expect(codeObject.code).to.equal(generatedCode);
        expect(codeObject.state).to.equal(state);
        expect(codeObject.response_type).to.equal('code');
        expect(codeObject.redirect_uris).to.equal('http://localhost:1234/dummy');
        const today = new Date();
        today.setDate(today.getDate() + 2);
        expect(codeObject.ttl < today).to.be.true;
    });

    it('should generate a code for a valid client without response type', async () => {
        const state = Randomstring.generate();
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=http://localhost:1234/dummy&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
        expect(res.request.query).to.deep.equal({
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            state
        });
        // Extract the generated reqId
        const dom = new JSDOM(res.result);
        const reqId = dom.window.document.querySelector('input').getAttribute('value');

        const approvalRes = await server.inject({
            method: 'POST',
            url: '/oauth2/approve',
            payload: `reqId=${ reqId }&decision=approve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: { user: 'test' }
        });
        // TODO: properly parse URL query parameters
        const respUrl = approvalRes.headers.location;
        const generatedCode = respUrl.split(/=(.+)/)[1].split('&')[0];
        const Models = server.app.db;
        const codeObject = await Models.findCodeByValue(generatedCode);
        expect(codeObject.client_id).to.equal('v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU');
        expect(codeObject.code).to.equal(generatedCode);
        expect(codeObject.state).to.equal(state);
        expect(codeObject.response_type).to.equal('code');
        expect(codeObject.redirect_uris).to.equal('http://localhost:1234/dummy');
        const today = new Date();
        today.setDate(today.getDate() + 2);
        expect(codeObject.ttl < today).to.be.true;
    });

    it('should generate a code for a valid client with space as response type', async () => {
        const state = Randomstring.generate();
        const urlParsed = UrlUtils.buildUrl('/oauth2/authorize', {
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            response_type: ' ',
            state
        });
        const res = await server.inject({
            method: 'GET',
            url: urlParsed,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
        expect(res.request.query).to.deep.equal({
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            response_type: ' ',
            state
        });
        // Extract the generated reqId
        const dom = new JSDOM(res.result);
        const reqId = dom.window.document.querySelector('input').getAttribute('value');

        const approvalRes = await server.inject({
            method: 'POST',
            url: '/oauth2/approve',
            payload: `reqId=${ reqId }&decision=approve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: { user: 'test' }
        });
        // TODO: properly parse URL query parameters
        const respUrl = approvalRes.headers.location;
        const generatedCode = respUrl.split(/=(.+)/)[1].split('&')[0];
        const Models = server.app.db;
        const codeObject = await Models.findCodeByValue(generatedCode);
        expect(codeObject.client_id).to.equal('v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU');
        expect(codeObject.code).to.equal(generatedCode);
        expect(codeObject.state).to.equal(state);
        expect(codeObject.response_type).to.equal('code');
        expect(codeObject.redirect_uris).to.equal('http://localhost:1234/dummy');
        const today = new Date();
        today.setDate(today.getDate() + 2);
        expect(codeObject.ttl < today).to.be.true;
    });

    it('should respect the TTL for the code defined in the configuration', async () => {
        const state = Randomstring.generate();
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=http://localhost:1234/dummy&response_type=code&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });
        expect(res.statusCode).to.equal(200);
        expect(res.request.query).to.deep.equal({
            client_id: 'v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU',
            redirect_uris: 'http://localhost:1234/dummy',
            response_type: 'code',
            state
        });
        // Extract the generated reqId
        const dom = new JSDOM(res.result);
        const reqId = dom.window.document.querySelector('input').getAttribute('value');

        const approvalRes = await server.inject({
            method: 'POST',
            url: '/oauth2/approve',
            payload: `reqId=${ reqId }&decision=approve`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: { user: 'test' }
        });
        // TODO: properly parse URL query parameters
        const respUrl = approvalRes.headers.location;
        const generatedCode = respUrl.split(/=(.+)/)[1].split('&')[0];
        const Models = server.app.db;
        const codeObject = await Models.findCodeByValue(generatedCode);
        expect(codeObject.client_id).to.equal('v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU');
        expect(codeObject.code).to.equal(generatedCode);
        expect(codeObject.state).to.equal(state);
        expect(codeObject.response_type).to.equal('code');
        expect(codeObject.redirect_uris).to.equal('http://localhost:1234/dummy');
        const today = new Date();
        const { codeTTL } = Options.authGrantType;
        expect(codeObject.ttl < today).to.be.false;
        today.setDate(today.getDate() + codeTTL + 1);
        expect(codeObject.ttl < today).to.be.true;
    });

    it('should display the validated scopes in the client approval form', async () => {
        const state = Randomstring.generate();
        const redirectUri = 'http://localhost:1234/dummy';
        const scope = 'foo bar';
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=${ redirectUri }&response_type=code&scopes=${ scope }&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });

        const dom = new JSDOM(res.result);
        const inputNodes = dom.window.document.querySelectorAll('input');
        expect(inputNodes[1].getAttribute('name')).to.equal(scope.split(' ')[0]);
        expect(inputNodes[2].getAttribute('name')).to.equal(scope.split(' ')[1]);
    });

    it('should only submit scopes approved by the resource owner', async () => {
        const state = Randomstring.generate();
        const redirectUri = 'http://localhost:1234/dummy';
        const scope = 'foo bar';
        const res = await server.inject({
            method: 'GET',
            url: `/oauth2/authorize?client_id=v30UYVDty9P1D3g7yxCEdzzF9WzrKmKWQODy7EuAU4jGE5JlDfWVkUYkOgErV8AEf5qDU&redirect_uris=${ redirectUri }&response_type=code&scopes=${ scope }&state=${ state }`,
            credentials: { user: 'test' },
            validate: true
        });

        const dom = new JSDOM(res.result);
        // Extract the generated reqId
        const reqId = dom.window.document.querySelector('input').getAttribute('value');

        const inputNodes = dom.window.document.querySelectorAll('input');
        expect(inputNodes[1].getAttribute('name')).to.equal(scope.split(' ')[0]);
        expect(inputNodes[2].getAttribute('name')).to.equal(scope.split(' ')[1]);
        const approvalRes = await server.inject({
            method: 'POST',
            url: '/oauth2/approve',
            payload: `reqId=${ reqId }&decision=approve&foo=on`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: { user: 'test' }
        });

        const respUrl = approvalRes.headers.location;
        const generatedCode = respUrl.split(/=(.+)/)[1].split('&')[0];
        const Models = server.app.db;
        const codeObject = await Models.findCodeByValue(generatedCode);
        expect(codeObject.scopes).to.be.ofSize(1);
        expect(codeObject.scopes).to.be.containing('foo');
    });

    after(async () => {
        await server.stop();
        console.log('Server stopped.');
    });
});
