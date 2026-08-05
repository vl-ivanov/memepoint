const crypto = require("crypto");
const Verification = require("../models/verification");
const { sendMail } = require("../helpers/email");
const { createVerification } = require("../helpers/miracl");

const baseUrl = process.env.APP_DOMAIN;

function generateCode() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports.showVerify = (req, res) => {
  // Miracl usually passes the user ID as user_id, but in some flows (e.g.
  // "sign in as a different user") it may not. Let the user enter it instead
  // of bouncing back to the login page.
  const userId = req.query.user_id || req.query.email || "";
  res.render("users/verify", { userId });
};

module.exports.sendVerificationEmail = async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    req.flash("error", "Invalid verification request");
    return res.redirect("/users/login");
  }

  try {
    const code = generateCode();
    await Verification.findOneAndUpdate(
      { userId },
      { code },
      { upsert: true, new: true },
    );

    const confirmUrl = `${baseUrl}/verify/confirm?user_id=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}`;
    await sendMail({
      to: userId,
      subject: "Verify your email",
      text: `Click the link to verify your email and complete registration: ${confirmUrl}`,
      html: `<p>Click the link to verify your email and complete registration:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
    });

    res.render("users/verify-pending", { userId });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to send verification email");
    res.redirect("/users/login");
  }
};

// Render a landing page that confirms via POST so mail-client prefetchers
// (Gmail, Outlook Safe Links) cannot consume the verification code.
module.exports.confirmVerification = (req, res) => {
  const { user_id: userId, code } = req.query;
  if (!userId || !code) {
    req.flash("error", "Invalid verification link");
    return res.redirect("/users/login");
  }
  res.render("users/verify-confirm", { userId, code });
};

module.exports.confirmVerificationApi = async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) {
    return res.status(400).json({ error: "Invalid verification request" });
  }

  try {
    const record = await Verification.findOne({ userId, code });
    if (!record) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification link" });
    }

    await Verification.deleteOne({ _id: record._id });

    // If the user started from /auth/login, the OIDC state is still in the
    // session. Pass it back to Miracl so the final /auth/callback is valid.
    const { verificationURL } = await createVerification({
      userId,
      redirectURI: `${baseUrl}/auth/callback`,
      clientId: process.env.MIRACL_CLIENT_ID,
      scope: ["openid", "profile", "email"],
      state: req.session?.oidc?.state,
    });

    res.json({ verificationRedirectUrl: verificationURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed, please try again" });
  }
};

module.exports.showConfirmed = (req, res) => {
  res.render("users/verify-confirmed");
};
