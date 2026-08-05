const nodemailer = require("nodemailer");

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM;

const transporter =
  host && user && pass
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
    : null;

module.exports.sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.log("Email not configured. Would send:");
    console.log({ to, subject, text });
    return { messageId: "logged" };
  }
  return transporter.sendMail({ from, to, subject, text, html });
};
