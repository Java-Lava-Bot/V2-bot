const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");

module.exports = {
  name: "timeout_remove",
  aliases: ["untimeout", "unmute"],
  description: "Remove a timeout from a server member. Usage: timeout_remove <@user|userID> [reason]",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ModerateMembers],
    bot: [PermissionFlagsBits.ModerateMembers],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${warning_emote} You must have the Moderate Members permission to use this command.`);
    }

    const target = message.mentions.members.first() || (await message.guild.members.fetch(args[0]).catch(() => null));
    if (!target) {
      return message.reply(`Usage: \`${client.config.prefix}timeout_remove <@user|userID> [reason]\``);
    }

    if (!target.kickable) {
      return message.reply(`${warning_emote} I cannot remove the timeout from this user! Ensure I have sufficient permissions.`);
    }

    if (message.member.id === target.id) {
      return message.reply(`${warning_emote} You cannot remove the timeout from yourself!`);
    }

    if (target.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(`${warning_emote} You cannot remove the timeout from a person with Administrator permissions.`);
    }

    const reason = args.slice(1).join(" ") || "No reason given.";

    try {
      await target.timeout(null, reason);

      const embed = new EmbedBuilder().setColor("Blue").setDescription(`${success_emote} ${target.user.tag}'s timeout has been **removed** | ${reason}`);

      const dmEmbed = new EmbedBuilder().setColor("Blue").setDescription(`${success_emote} Your timeout in ${message.guild.name} has been removed. Reason: ${reason}`);

      await target.send({ embeds: [dmEmbed] }).catch(() => {});

      return message.reply({ content: `${target.user}`, embeds: [embed] });
    } catch (error) {
      logger.error(error, client);
      LogError(error, client, "prefix/timeout_remove");
      return message.reply(`${error_emote} An error occurred while removing the timeout. Please join our support server for help: ${supportinvite}`);
    }
  },
};
