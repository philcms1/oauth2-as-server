/* eslint-disable require-jsdoc */
/**
 * Crafted in Erebor by thorin on 2017-12-30
 */
class ExtendableError extends Error {
    constructor(message, status) {
        // Calling parent constructor of base Error class
        super(message);
        // Saving class name in the property of our custom error as a shortcut
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            // Capturing stack trace, excluding constructor from it
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
        this.status = status || 500;
    }
}

module.exports.MissingBasicAuthCredentialsError =
    class MissingBasicAuthCredentialsError extends ExtendableError {
        constructor(message) {
            super(message || 'Missing Basic Auth credentials in headers or body', 401);
        }
    };

module.exports.DuplicateCredentialsError = class DuplicateCredentialsError extends ExtendableError {
    constructor(message) {
        super(message || 'Duplicate credentials', 400);
    }
};

module.exports.InvalidClientError = class InvalidClientError extends ExtendableError {
    constructor(message, clientId) {
        super(message || 'Invalid client', 403);
        this.clientId = clientId || null;
    }
};

module.exports.InvalidCodeError = class InvalidCodeError extends ExtendableError {
    constructor(message, code) {
        super(message || 'Invalid code', 403);
        this.code = code || null;
    }
};

module.exports.RequestKeyCacheError = class RequestKeyCacheError extends ExtendableError {
    constructor(message, code) {
        super(message || 'Error retrieving request data from cache', 500);
        this.code = code || null;
    }
};

module.exports.InvalidRefreshTokenError = class InvalidRefreshTokenError extends ExtendableError {
    constructor(message, refreshToken) {
        super(message || 'Invalid refresh token', 403);
        this.refreshToken = refreshToken || null;
    }
};
