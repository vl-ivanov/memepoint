const crypto = require("crypto");
const utils = {
  generateToken: (length) => crypto.randomBytes(length).toString("hex"),
};

module.exports = utils;
