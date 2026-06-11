const { model, Schema } = require("mongoose");

let ReminderData = new Schema({
  User: String,
  RemTime: { type: Number, required: true, index: true },
  // Add TTL via Date field:
  expiresAt: { type: Date, index: { expires: "0s" } },
  Reminder: { type: String, maxlength: 1000 },
});

module.exports = model("ReminderData", ReminderData);
