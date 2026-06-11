const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, success_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");

module.exports = {
  name: "purge",
  description: "Purge messages in a channel. Usage: purge <amount> [#channel]",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageMessages],
    bot: [PermissionFlagsBits.ManageMessages],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply(`${error_emote} You don't have permission to manage messages.`);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply(`Usage: \`${client.config.prefix}purge <amount 1-100> [#channel]\`\nExample: \`${client.config.prefix}purge 10\``);
    }

    const channel = message.mentions.channels.first() || message.channel;

    try {
      if (!channel.isTextBased()) {
        return message.reply(`${error_emote} The specified channel is not a text channel.`);
      }

      const messages = await channel.messages.fetch({ limit: amount });
      const deletedMessages = await channel.bulkDelete(messages, true);

      const confirmMsg = await message.reply({ content: `${success_emote} Successfully purged ${deletedMessages.size} messages in ${channel}.` });

      const logEmbed = new EmbedBuilder()
        .setTitle("Messages Purged")
        .setColor("Red")
        .setDescription(`${success_emote} A total of ${deletedMessages.size} messages were purged in ${channel}.`)
        .addFields({ name: "Channel", value: `${channel}`, inline: true }, { name: "Amount", value: `${deletedMessages.size}`, inline: true }, { name: "Purged By", value: `${message.author.tag} (${message.author.id})`, inline: false })
        .setTimestamp();

      await channel.send({ embeds: [logEmbed] });
    } catch (err) {
      logger.error(`[Prefix Purge] Error executing command for ${message.author.tag}: ${err?.message ?? err}`, err);
      LogError(err, client, "prefix/purge");
      return message.reply(`${error_emote} An error occurred while trying to purge messages. Please ensure I have the necessary permissions and try again. If the issue persists, contact support: ${supportinvite}`);
    }
  },
};
