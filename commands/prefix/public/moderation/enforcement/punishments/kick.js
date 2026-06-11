const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote, kicked_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");

module.exports = {
  name: "kick",
  description: "Kick a user from the server.",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.KickMembers],
    bot: [PermissionFlagsBits.KickMembers],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply(`${warning_emote} You can't execute this command because you don't have the **KICK MEMBERS** permission!`);
    }

    const target = message.mentions.members.first() || (await message.guild.members.fetch(args[0]).catch(() => null));
    if (!target) {
      return message.reply(`Usage: \`${client.config.prefix}kick <@user|userID> [reason]\``);
    }

    if (!target.kickable) {
      return message.reply(`${warning_emote} I can't kick this user because they have roles that are above me or you.`);
    }

    const reason = args.slice(1).join(" ") || "No reason given.";

    const dmEmbed = new EmbedBuilder().setColor("DarkOrange").setDescription(`${kicked_emote} You have been kicked from the server **${message.guild.name}** | ${reason}`);

    await target.send({ embeds: [dmEmbed] }).catch(() => {});

    await target.kick(reason).catch((error) => {
      logger.error(error, client);
      LogError(error, client, "prefix/kick");
      return message.reply(`${error_emote} An error occurred while kicking the user. Please join our support server for help: ${supportinvite}`);
    });

    const embed = new EmbedBuilder().setColor("Navy").setDescription(`${success_emote} ${target.user.tag} has been **kicked** | ${reason}`);

    return message.reply({ embeds: [embed] });
  },
};
