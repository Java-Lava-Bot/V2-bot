const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");

module.exports = {
  name: "timeout",
  aliases: ["mute", "gag"],
  description: "Time out a server member. Usage: timeout <@user|userID> <seconds> [reason]",
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
      return message.reply(`Usage: \`${client.config.prefix}timeout <@user|userID> <seconds> [reason]\`\nExample: \`${client.config.prefix}timeout @User 300 spamming\``);
    }

    const durationArg = args[1];
    const duration = parseInt(durationArg);
    if (!durationArg || isNaN(duration) || duration <= 0) {
      return message.reply(`${warning_emote} Please provide a valid duration in seconds. Example: \`${client.config.prefix}timeout @User 300 spamming\``);
    }

    if (!target.kickable) {
      return message.reply(`${warning_emote} I cannot timeout this user because their role is above mine!`);
    }

    if (message.member.id === target.id) {
      return message.reply(`${warning_emote} You cannot timeout yourself!`);
    }

    if (target.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(`${warning_emote} You cannot timeout a person with administrator permissions.`);
    }

    const reason = args.slice(2).join(" ") || "No reason given.";

    try {
      await target.timeout(duration * 1000, reason);

      const embed = new EmbedBuilder().setColor("Blue").setDescription(`${success_emote} ${target.user.tag} has been **timed out** for ${Math.floor(duration / 60)} minute(s) because: ${reason}`);

      const dmEmbed = new EmbedBuilder().setColor("Blue").setDescription(`${success_emote} You have been timed out in ${message.guild.name} for ${Math.floor(duration / 60)} minute(s). Reason: ${reason}`);

      await target.send({ embeds: [dmEmbed] }).catch(() => {});

      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(error, client);
      LogError(error, client, "prefix/timeout");
      return message.reply(`${error_emote} An error occurred while timing out the user. Please join our support server for help: ${supportinvite}`);
    }
  },
};
