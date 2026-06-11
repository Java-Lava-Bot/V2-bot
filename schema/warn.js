const mongoose = require("mongoose");

const warningData = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  warnId: { type: Number, required: true },
  active: { type: Boolean, default: true },

  // Fields for tracking cleared warnings (bulk clear)
  clearedBy: { type: String, default: null },
  clearedAt: { type: Date, default: null },
  clearReason: { type: String, default: null },

  // Fields for tracking removed warnings (single removal)
  removedBy: { type: String, default: null },
  removedAt: { type: Date, default: null },
  removeReason: { type: String, default: null },
});

// Indexes for fast queries
warningData.index({ guildId: 1, userId: 1 });
warningData.index({ guildId: 1, userId: 1, active: 1 });
warningData.index({ guildId: 1, userId: 1, warnId: 1 });

module.exports = mongoose.model("warningData", warningData);
