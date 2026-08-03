// Auth0 configuration
const config = {
    authRequired: false,      // Allow public routes
    secret: process.env.SESSION_SECRET,
    clientSecret: process.env.MIRACL_SECRET,
    baseURL: process.env.APP_DOMAIN,
    clientID: process.env.MIRACL_CLIENT_ID,
    issuerBaseURL: process.env.MIRACL_ISSUER_BASE_URL,
    authorizationParams: {
        response_type: "code",
        scope: "openid profile email",
    }
};

module.exports = config;
