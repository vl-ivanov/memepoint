const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const verificationSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: "24h" },
});

module.exports = mongoose.model("Verification", verificationSchema);
