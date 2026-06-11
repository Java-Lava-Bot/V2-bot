const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { logger } = require("../../../../../../utils/logger");
const { LogError } = require("../../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");

module.exports = {
  name: "lock_channel",
  description: "Lock a channel. Usage: lock_channel <#channel|channelID>",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageChannels],
    bot: [PermissionFlagsBits.ManageChannels],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply(`${error_emote} You don't have permission to manage channels.`);
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel) {
      return message.reply(`Usage: \`${client.config.prefix}lock_channel <#channel|channelID>\``);
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
      });

      await message.reply(`${success_emote} The channel has been locked successfully.`);

      const logEmbed = new EmbedBuilder().setTitle("Channel Locked").setDescription(`${warning_emote} Channel ${channel} has been locked by ${message.author}.`).setColor("Red").setTimestamp();

      await channel.send({ embeds: [logEmbed] });
    } catch (err) {
      logger.error(`[Prefix Lock Channel] Error: ${err?.message ?? err}`, err);
      LogError(err, client, "prefix/lock_channel");
      return message.reply(`${error_emote} An error occurred while executing the command. If you need assistance, please join our support server ${supportinvite}`);
    }
  },
};
