const express = require("express");
const router = express.Router();
const verify = require("../controllers/verify");

router.get("/", verify.showVerify);
router.post("/", verify.sendVerificationEmail);
router.get("/confirm", verify.confirmVerification);
router.post("/confirm", verify.confirmVerificationApi);
router.get("/confirmed", verify.showConfirmed);

module.exports = router;
