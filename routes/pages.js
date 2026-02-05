const express = require("express");
const router = express.Router({ mergeParams: true });
const pages = require("../controllers/pages");

router.get("/:slug", pages.getPage);

module.exports = router;
