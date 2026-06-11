const { model, Schema } = require("mongoose");

const ScamPreventionNotify = new Schema(
  {
    GuildId: { type: String, required: true, unique: true },
    // where broadcasts should be posted
    NotifyChannelId: { type: String, default: null },
    // which role to ping for scam-prevention updates
    NotifyRoleId: { type: String, default: null },
    // NEW: the AutoMod rule ID created by /automod-scam-prevention
    // (this is what lets us "update to latest" safely)
    ScamPreventionRuleId: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = model("ScamPreventionNotify", ScamPreventionNotify);
