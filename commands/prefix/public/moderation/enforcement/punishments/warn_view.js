const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");
const warningData = require("../../../../../../schema/warn");

module.exports = {
  name: "warnings",
  aliases: ["warns", "warningsview"],
  description: "View warnings for a user",
  usage: "!warnings <@user>",
  permissions: [PermissionsBitField.Flags.KickMembers],

  async execute(message, args, client) {
    const contextPrefix = `[Warnings-Prefix][guild=${message.guild?.id ?? "unknown"}][executor=${message.author?.id ?? "unknown"}]`;

    try {
      // Check permissions
      if (!message.member?.permissions?.has(PermissionsBitField.Flags.KickMembers)) {
        logger.warn(`${contextPrefix} Missing permission KickMembers. executor=${message.author?.tag}`);
        return await message.reply({
          content: `${warning_emote} You need the **KICK MEMBERS** permission to view warnings!`,
        });
      }

      // Parse mentioned user
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return await message.reply({
          content: `${error_emote} Please mention a user to view their warnings!\n**Usage:** \`!warnings @user\``,
        });
      }

      // Fetch active warnings for the user
      const warnings = await warningData
        .find({
          guildId: message.guild.id,
          userId: targetUser.id,
          active: true,
        })
        .sort({ timestamp: -1 })
        .lean()
        .exec();

      if (!warnings || warnings.length === 0) {
        const embed = new EmbedBuilder().setColor("Green").setDescription(`${success_emote} **${targetUser.tag}** has no active warnings!`);

        return await message.reply({ embeds: [embed] });
      }

      // Build warning list
      let description = `📋 **Warnings for ${targetUser.tag}**\n`;
      description += `Total Active Warnings: **${warnings.length}**\n\n`;

      for (let i = 0; i < warnings.length; i++) {
        const warn = warnings[i];
        const moderator = await client.users.fetch(warn.moderatorId).catch(() => null);
        const modname = moderator ? moderator.tag : "Unknown Moderator";
        const date = new Date(warn.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        description += `**[#${warn.warnId}]** ⚠️ Warned by ${modname}\n`;
        description += `**Reason:** ${warn.reason}\n`;
        description += `**Date:** ${date}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setDescription(description)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      logger.info(`${contextPrefix} Viewed warnings for user=${targetUser.tag} (${warnings.length} warnings)`);
    } catch (error) {
      logger.error(`${contextPrefix} Error viewing warnings: ${error?.message ?? error}`);
      LogError(error, message, "Warnings-Prefix");
      const embed = new EmbedBuilder().setColor("Red").setDescription(`${error_emote} An unexpected error occurred while trying to view warnings. Please try again later.\n\nIf this issue persists, please join the support server: ${supportinvite}`);
      await message.reply({ embeds: [embed] });
    }
  },
};
