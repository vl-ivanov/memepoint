const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  googleId: String,
  facebookId: String,
  image: String,
  email: String,
  username: String,
  role: {
    type: String,
    default: "user",
  },
});

module.exports = mongoose.model("User", UserSchema);
