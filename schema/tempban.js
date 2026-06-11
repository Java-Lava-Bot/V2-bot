const { Schema, model } = require("mongoose");

const TempbanSchemaData = new Schema({
  Guild: String,
  User: String,
  BanTime: String,
});

module.exports = model("Tempban", TempbanSchemaData);
