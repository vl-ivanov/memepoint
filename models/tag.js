const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TagSchema = new Schema({
  name: {
    type: String,
    unique: true,
    lowercase: true, // Normalize tags
    trim: true,
  },
  displayName: String, // Keep original case for display
  countNum: { type: Number, default: 0 },
  category: String, // Optional: for grouping
  createdAt: { type: Date, default: Date.now },
});

TagSchema.index({ countNum: -1 }); // For popular tags

module.exports = mongoose.model("Tag", TagSchema);
