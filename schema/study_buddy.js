const { model, Schema } = require("mongoose");

let StudyBuddySchema = new Schema({
  userId: { type: String, required: true, unique: true },
  customApiKey: { type: String, default: null },
  dailyUsage: { type: Number, default: 0 },
  lastUsed: { type: Date, default: Date.now },
});

module.exports = model("StudyBuddy", StudyBuddySchema);
