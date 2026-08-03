# MIRACL OpenID Integration

This document describes how to integrate MIRACL (OIDC provider) into an Express app using the [`express-openid-connect`](https://github.com/auth0/express-openid-connect) middleware, as implemented in this repository.

## Overview

`express-openid-connect` handles the whole OIDC authorization-code flow for you: it adds `/login`, `/logout` and `/callback` routes, manages the session, verifies the ID token, and exposes the authenticated user via `req.oidc.user`. No passport strategies are needed for the OIDC flow.

## 1. Install the dependency

```bash
pnpm add express-openid-connect
```

The middleware version used here is `^3.3.0`.

## 2. Configure the environment

Add the following variables to `.env` (see `.env.dist`):

```bash
# MIRACL
MIRACL_SECRET=           # client secret from the MIRACL application
MIRACL_CLIENT_ID=        # client id from the MIRACL application
MIRACL_ISSUER_BASE_URL=  # e.g. https://your-tenant.miracl.cloud
```

The existing `SESSION_SECRET` and `APP_DOMAIN` (`baseURL`) variables are also used. Remove the old `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `FACEBOOK_*` variables since the passport-based social login was dropped.

## 3. Create the OIDC config module

`openid-config.js`:

```js
const config = {
  authRequired: false, // Allow public routes; protect specific routes with isLoggedIn()
  secret: process.env.SESSION_SECRET,
  clientSecret: process.env.MIRACL_SECRET,
  baseURL: process.env.APP_DOMAIN,
  clientID: process.env.MIRACL_CLIENT_ID,
  issuerBaseURL: process.env.MIRACL_ISSUER_BASE_URL,
  authorizationParams: {
    response_type: "code",
    scope: "openid profile email",
  },
};

module.exports = config;
```

- `authRequired: false` keeps the app public; individual routes opt in via the `isLoggedIn` middleware.
- The `secret` signs the session cookies that the middleware uses to store the OIDC state/verifier.

## 4. Mount the middleware in `app.js`

Import and apply the middleware early, before any routes:

```js
const { auth } = require("express-openid-connect");
const openidConfig = require("./openid-config");

// Apply the auth middleware
app.use(auth(openidConfig));
```

The middleware must run after `express-session` is configured so it can persist the OIDC transaction data.

## 5. Replace passport user handling

The old code initialized passport and used `req.user`:

```js
require("./passport")(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate("remember-me"));
```

That block was removed. `express-openid-connect` manages its own session, so only the session middleware is required.

Update the current-user locals to read from `req.oidc.user`:

```js
app.use((req, res, next) => {
  res.locals.currentUser = req.oidc.user
    ? {
        ...req.oidc.user,
        username: (req.oidc.user?.email || req.oidc.user?.sub).split("@")[0],
      }
    : null;
  // ...
});
```

## 6. Update the auth guard middleware

`middleware.js` previously used `req.isAuthenticated()` (passport). Change it to the OIDC equivalent and point redirects at the middleware's `/login` route:

```js
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    req.session.requestedUrl = req.originalUrl;
    req.flash("error", "You have to login first");
    if (req.xhr) {
      return res.json({
        error: "You have to login first",
        redirect: "/login",
      });
    }
    return res.redirect("/login");
  }
  next();
};
```

`req.session.requestedUrl` is saved so the post-login redirect can return the user to the page they originally requested.

## 7. Use the built-in routes

`express-openid-connect` registers these routes for you, so no custom auth router is needed:

| Route        | Purpose                                  |
| ------------ | ---------------------------------------- |
| `/login`     | Starts the OIDC authorization-code flow  |
| `/logout`    | Ends the session                         |
| `/callback`  | Handles the provider redirect (`post_login_redirect_uri`) |

Update views and controllers to point at these routes instead of the old passport routes:

- `views/partials/navbar.ejs`, `views/partials/panel-left.ejs`, `views/errors/404.ejs`: Login/Register → `/login`, Logout → `/logout`.
- `middleware.js` and `controllers/users.js`: redirect to `/login` instead of `/users/login`.
- `routes/auths.js` (Google/Facebook passport routes) was deleted and no longer mounted in `app.js`.

## 8. Configure the MIRACL application

In the MIRACL admin console for your application, register the redirect (callback) URI:

```
{APP_DOMAIN}/callback
```

using the same `baseURL` (`APP_DOMAIN`) configured above, and take note of the client ID, secret and issuer URL.

## 9. Accessing user data

The decoded ID token is available on every request as `req.oidc.user` (e.g. `sub`, `email`, `name`). In views it is already exposed as `currentUser`. The `username` local is derived from the email prefix (or the `sub` when no email is present).

## Notes / remaining cleanup

- `passport` is still used in `routes/users.js` for the legacy local username/password login at `/login`. If MIRACL is the only auth source, that route and the `passport.js` file can be removed.
- The default routes are mounted at the app root. They can be namespaced by passing an `appSession`/`routes` config if `/login` conflicts with other handlers.
- CORS/CSP: the CSP in `app.js` does not currently allow the MIRACL issuer for `connect-src`; if the provider loads resources client-side, add its origin there.
