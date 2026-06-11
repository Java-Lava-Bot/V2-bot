const { model, Schema } = require("mongoose");

const HoneypotSchema = new Schema({
  guildId: { type: String, required: true }, // Discord server ID that is using the honeypot system
  channelId: { type: String, required: true }, // The specific channel ID that is designated as the honeypot
  logChannelId: { type: String, default: null }, // Optional channel ID where honeypot events (like bans or errors) will be logged
  punishmentType: { type: String, enum: ["purge", "timeout", "softban"], default: "softban" }, // The type of punishment to apply when a honeypot violation occurs. "purge" deletes messages, "timeout" applies a temporary timeout, and "softban" bans and immediately unbans the user to purge messages.
});

HoneypotSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model("Honeypot", HoneypotSchema);
