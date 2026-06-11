const { EmbedBuilder } = require("discord.js");
const { logger } = require("./logger");
const { errorLog } = require("../config/config");
const { error_emote } = require("./emotes");

/**
 * Logs an error to a Discord channel
 * @param {Error|string} error - The error to log
 * @param {import('discord.js').Client} client - The Discord client
 * @param {string} context - Context of the error
 */
async function LogError(error, client, context = "Unknown Context") {
  if (!client?.isReady()) {
    logger.error("Client is not ready, skipping Discord log:", error);
    return;
  }

  const errorChannelId = client.config?.errorLog?.[0] || errorLog?.[0];

  if (!errorChannelId) {
    logger.error("ERROR_CHANNEL_ID is not configured!");
    return;
  }

  try {
    const errorChannel = await client.channels.fetch(errorChannelId).catch(() => null);

    if (!errorChannel) {
      logger.error("Could not fetch error logging channel:", errorChannelId);
      return;
    }

    const safeMessage = (error?.message ?? String(error)).substring(0, 500);

    const errorEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle(`${error_emote} Error Detected`)
      .setDescription(`**${safeMessage}**`)
      .addFields({ name: "Context", value: context, inline: true }, { name: "Error Type", value: error.constructor?.name ?? "Unknown", inline: true }, { name: "Error Code", value: String(error.code ?? "N/A"), inline: true }, { name: "Client User", value: `<@${client.user.id}>`, inline: true }, { name: "Timestamp", value: new Date().toISOString(), inline: true })
      .setTimestamp();

    await errorChannel.send({ embeds: [errorEmbed] });
  } catch (sendError) {
    logger.error("Failed to send error to logging channel:", sendError);
  }
}

module.exports = { LogError };
