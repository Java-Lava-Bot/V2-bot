const { EmbedBuilder, MessageFlags } = require("discord.js");

/**
 * The boilerplate notice embed sent after every successful automod rule creation.
 * Extracted here so it isn't copy-pasted across every command file.
 *
 * @param {string} warning_emote
 * @returns {EmbedBuilder}
 */
function buildNoticeEmbed(warning_emote) {
  return new EmbedBuilder().setColor("DarkBlue").setTitle("AutoMod Notice!").setDescription(`${warning_emote} **Notice:** AutoMod rules will **not** apply to the **server owner**, users with **Administrator**, or users with **Manage Guild**.`).setTimestamp();
}

/**
 * Builds a red error embed.
 *
 * @param {string} error_emote
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function buildErrorEmbed(error_emote, description) {
  return new EmbedBuilder().setColor("#FF0000").setTitle("Error Creating AutoMod Rule").setDescription(description).setTimestamp();
}

/**
 * Safely replies or edits a reply on an interaction, depending on its current state.
 * Swallows errors so a failed reply never masks the original error.
 *
 * @param {import("discord.js").Interaction} interaction
 * @param {object} payload
 */
async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  } catch (_) {}
}

/**
 * Awaits a modal submit on the given interaction, returning null on timeout.
 *
 * @param {import("discord.js").Interaction} interaction
 * @param {string} customId
 * @returns {Promise<import("discord.js").ModalSubmitInteraction|null>}
 */
async function awaitAutomodModal(interaction) {
  try {
    return await interaction.awaitModalSubmit({
      filter: (i) => i.customId === "automod_name" && i.user.id === interaction.user.id,
      time: 3 * 60 * 1000,
    });
  } catch {
    return null;
  }
}

module.exports = { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal };
