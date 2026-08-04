const client = require("openid-client");

const issuerUrl = process.env.MIRACL_ISSUER_BASE_URL;
const clientId = process.env.MIRACL_CLIENT_ID;
const clientSecret = process.env.MIRACL_SECRET;
const baseUrl = process.env.APP_DOMAIN;
const redirectUri = baseUrl + "/auth/callback";

if (!issuerUrl || !clientId || !clientSecret || !baseUrl) {
  throw new Error("Missing Miracl OIDC configuration");
}

// Miracl expects Basic auth without URL-encoding the client_id / secret
function miraclClientSecretBasic(secret) {
  return (_as, c, _body, headers) => {
    const credentials = Buffer.from(`${c.client_id}:${secret}`).toString(
      "base64",
    );
    headers.set("authorization", `Basic ${credentials}`);
  };
}

const configPromise = client
  .discovery(
    new URL(issuerUrl),
    clientId,
    {
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      response_types: ["code"],
    },
    miraclClientSecretBasic(clientSecret),
  )
  .then((config) => {
    config[client.customFetch] = async (...args) => {
      const [url, options = {}] = args;
      if (url.toString().includes("/oidc/token")) {
        console.log("Token request URL:", url.toString());
        console.log("Token request method:", options.method);
        const headers = options.headers
          ? Object.fromEntries(new Headers(options.headers).entries())
          : {};
        console.log("Token request headers:", headers);
        if (options.body) {
          console.log("Token request body:", options.body.toString());
        }
      }
      return fetch(...args);
    };
    return config;
  });

module.exports.getConfig = () => configPromise;

module.exports.isAuthenticated = (req) => Boolean(req.session?.oidcUser);

module.exports.login = async (req, res) => {
  const config = await configPromise;
  const code_verifier = client.randomPKCECodeVerifier();
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  req.session.oidc = {
    state,
    nonce,
    code_verifier,
    returnTo: req.session.requestedUrl || "/",
  };

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge,
    code_challenge_method: "S256",
  });
  res.redirect(url.href);
};

module.exports.callback = async (req, res) => {
  const config = await configPromise;
  const oidc = req.session.oidc || {};
  const currentUrl = new URL(req.originalUrl, baseUrl);

  console.log("OIDC callback URL:", currentUrl.href);
  console.log("OIDC session state:", oidc.state ? "present" : "missing");

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: oidc.code_verifier,
    expectedState: oidc.state,
    expectedNonce: oidc.nonce,
  });

  const claims = tokens.claims();

  if (!claims || !claims.sub) {
    throw new Error("No valid ID token returned from token endpoint");
  }

  const profile = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    nickname: claims.nickname,
    picture: claims.picture,
  };

  req.session.oidc = null;
  req.session.oidcUser = profile;

  res.redirect(oidc.returnTo || "/");
};

module.exports.logout = async (req, res) => {
  req.session.oidc = null;
  req.session.oidcUser = null;
  res.redirect("/");
};

module.exports.getProfile = (req) => req.session?.oidcUser || null;
