const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PageSchema = new Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Page = mongoose.model("Page", PageSchema);

module.exports = mongoose.model("Page", PageSchema);
