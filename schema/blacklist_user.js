const { model, Schema } = require("mongoose");

let userblacklist = new Schema({
  User: String,
});

module.exports = model("userblacklist", userblacklist);
