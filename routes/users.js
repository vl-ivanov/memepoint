const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware");
const users = require("../controllers/users");

router.get("/register", users.renderRegister);

router.route("/login").get(users.renderLogin);

router.get("/logout", isLoggedIn, users.logout);

module.exports = router;
