const express = require("express");
const router = express.Router({ mergeParams: true });
const pages = require("../controllers/pages");

router.get("/:pageId", pages.getPage);

module.exports = router;
