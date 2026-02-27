const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

exports.init = function (app) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN, // Replace with your actual DSN
    environment: process.env.NODE_ENV || "development",
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ app }),
    ],
    tracesSampleRate: 1.0, // Adjust in production
  });
};
