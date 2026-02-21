const mongoose = require("mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const RememberMeStrategy = require("passport-remember-me").Strategy;
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const Token = require("./models/token");
const utils = require("./helpers/utils");

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.APP_DOMAIN + "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        const newUser = {
          googleId: profile.id,
          username: profile.displayName,
          image: profile.photos[0].value,
          email: profile.emails?.[0]?.value,
          role: process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(
            profile.emails?.[0]?.value,
          )
            ? "admin"
            : "user",
        };

        try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            user.googleId = newUser.googleId;
            user.role = process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(
              profile.emails?.[0]?.value,
            )
              ? "admin"
              : "user";
            await user.save();
            done(null, user);
          } else {
            user = await User.create(newUser);
            done(null, user);
          }
        } catch (e) {
          console.log(e);
        }
      },
    ),
  );

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.APP_DOMAIN + "/auth/facebook/callback",
        profileFields: ["id", "email", "name", "picture"],
      },
      async (accessToken, refreshToken, profile, done) => {
        const newUser = {
          facebookId: profile.id,
          username: profile.name.givenName + " " + profile.name.familyName,
          image: profile.photos[0].value,
          email: profile.emails[0].value,
          role: process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(
            profile.emails?.[0]?.value,
          )
            ? "admin"
            : "user",
        };
        try {
          let user = await User.findOne({ facebookId: newUser.facebookId });
          if (user) {
            user.facebookId = newUser.facebookId;
            user.role = process.env.ADMIN_EMAIL.split(/\s*,\s*/).includes(
              profile.emails?.[0]?.value,
            )
              ? "admin"
              : "user";
            await user.save();
            done(null, user);
          } else {
            user = await User.create(newUser);
            done(null, user);
          }
        } catch (e) {
          console.error(e);
        }
      },
    ),
  );

  passport.use(new LocalStrategy(User.authenticate()));

  passport.use(
    new RememberMeStrategy(
      // Verify callback: consumes the token and returns the user
      function (token, done) {
        Token.consume(token, function (err, user) {
          if (err) return done(err);
          if (!user) return done(null, false);
          return done(null, user);
        });
      },
      // Issue callback: generates a new token
      function (user, done) {
        const token = utils.generateToken(64);
        Token.save(token, { userId: user.id }, function (err) {
          if (err) return done(err);
          return done(null, token);
        });
      },
    ),
  );
};
