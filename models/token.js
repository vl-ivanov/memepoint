const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
  value: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now, expires: "7d" }, // Auto-expire after 7 days
});

tokenSchema.statics.consume = function (token, callback) {
  this.findOneAndRemove({ value: token }).populate("userId").exec(callback);
};

tokenSchema.statics.save = function (token, metadata, callback) {
  this.create({ value: token, userId: metadata.userId }, callback);
};

module.exports = mongoose.model("Token", tokenSchema);
