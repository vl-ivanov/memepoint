const express = require("express");
const passport = require("passport");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const redirectUrl = req.session.requestedUrl || "/";
    delete req.session.requestedUrl;
    res.redirect(redirectUrl);
  },
);

router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] }),
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    const redirectUrl = req.session.requestedUrl || "/";
    delete req.session.requestedUrl;
    res.redirect(redirectUrl);
  },
);

module.exports = router;
