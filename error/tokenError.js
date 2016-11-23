var util = require("util");
// https://www.bennadel.com/blog/2828-creating-custom-error-objects-in-node-js-with-error-capturestacktrace.htm
function create (settings) {
    return(new TokenError(settings, create));
}

function TokenError (settings, implementationContext) {

    settings = (settings || {});

    this.name = "TokenError";
    this.message = (settings.message || "An error occurred.");
    this.status = (settings.status || 500);
    this.errorCode = (settings.errorCode || "");
    this.isTokenError = true;

    Error.captureStackTrace(this, (implementationContext || TokenError));

}

util.inherits(TokenError, Error);

exports.TokenError = TokenError;
exports.create = create;