const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");

module.exports = {
  name: "slowmode",
  description: "Set slowmode for a channel. Usage: slowmode <seconds 0-21600> [#channel]",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageChannels],
    bot: [PermissionFlagsBits.ManageChannels],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply(`${warning_emote} You don't have permission to manage channels.`);
    }

    const duration = parseInt(args[0]);
    if (isNaN(duration)) {
      return message.reply(`Usage: \`${client.config.prefix}slowmode <seconds 0-21600> [#channel]\`\nSet to 0 to disable.`);
    }

    if (duration < 0 || duration > 21600) {
      return message.reply(`${warning_emote} Slowmode duration must be between 0 and 21600 seconds.`);
    }

    const channel = message.mentions.channels.first() || message.channel;

    if (!channel.isTextBased()) {
      return message.reply(`${warning_emote} The specified channel is not a text-based channel.`);
    }

    try {
      await channel.setRateLimitPerUser(duration, `Slowmode set by ${message.author.tag} via prefix slowmode command`);

      await message.reply(`${success_emote} Slowmode for channel ${channel} has been set to ${duration} seconds.`);

      const logEmbed = new EmbedBuilder().setTitle("Slowmode Updated").setDescription(`${warning_emote} Slowmode for channel ${channel} has been set to ${duration} seconds by ${message.author}.`).setColor("Orange").setTimestamp();

      await channel.send({ embeds: [logEmbed] });
    } catch (error) {
      logger.error(`[Prefix Slowmode] Error: ${error?.message ?? error}`, error);
      LogError(error, client, "prefix/slowmode");
      return message.reply(`${error_emote} An error occurred while executing the command. If you need assistance, please join our support server ${supportinvite}`);
    }
  },
};
