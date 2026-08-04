const oidc = require("../oidc.js");

module.exports.renderRegister = (req, res) => {
  if (req.user) {
    req.flash("success", "You are already logged in");
    return res.redirect("/");
  }
  res.redirect("/users/login");
};

module.exports.renderLogin = (req, res) => {
  if (req.user) {
    req.flash("success", "You are already logged in");
    return res.redirect("/");
  }
  res.render("users/login");
};

module.exports.logout = async (req, res, next) => {
  try {
    await oidc.logout(req, res);
  } catch (err) {
    next(err);
  }
};
