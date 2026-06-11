const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");
const warningData = require("../../../../../../schema/warn");

module.exports = {
  name: "warningsclear",
  aliases: ["clearwarnings", "clearwarns"],
  description: "Clear all warnings for a user",
  usage: "!warningsclear <@user> [reason]",
  permissions: [PermissionsBitField.Flags.Administrator],

  async execute(message, args, client) {
    const contextPrefix = `[WarningsClear-Prefix][guild=${message.guild?.id ?? "unknown"}][executor=${message.author?.id ?? "unknown"}]`;

    try {
      // Check permissions (Administrator only)
      if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        logger.warn(`${contextPrefix} Missing permission Administrator. executor=${message.author?.tag}`);
        return await message.reply({
          content: `${warning_emote} You need the **ADMINISTRATOR** permission to clear warnings!`,
        });
      }

      // Parse mentioned user
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return await message.reply({
          content: `${error_emote} Please mention a user to clear their warnings!\n**Usage:** \`!warningsclear @user [reason]\``,
        });
      }

      // Get reason (everything after the mention)
      const reason = args.slice(1).join(" ") || "No reason provided";

      // Count active warnings before clearing
      const warningCount = await warningData.countDocuments({
        guildId: message.guild.id,
        userId: targetUser.id,
        active: true,
      });

      if (warningCount === 0) {
        return await message.reply({
          content: `${warning_emote} **${targetUser.tag}** has no active warnings to clear.`,
        });
      }

      // Clear warnings (set active to false instead of deleting for record keeping)
      await warningData.updateMany(
        {
          guildId: message.guild.id,
          userId: targetUser.id,
          active: true,
        },
        {
          $set: {
            active: false,
            clearedBy: message.author.id,
            clearedAt: new Date(),
            clearReason: reason,
          },
        },
      );

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(`${success_emote} Successfully cleared **${warningCount}** warning(s) for **${targetUser.tag}**\n\n**Reason:** ${reason}`)
        .setFooter({ text: `Cleared by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder().setColor("Green").setDescription(`${success_emote} Your warnings in **${message.guild.name}** have been cleared!\n\n**Reason:** ${reason}`);

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmErr) {
        logger.warn(`${contextPrefix} Failed to DM target=${targetUser?.id} (${targetUser?.tag}): ${dmErr?.message ?? dmErr}`);
      }

      logger.info(`${contextPrefix} Cleared ${warningCount} warning(s) for user=${targetUser.tag}. Reason: ${reason}`);
    } catch (error) {
      logger.error(`${contextPrefix} Error clearing warnings: ${error?.message ?? error}`);
      LogError(error, message, "WarningsClear-Prefix");
      const embed = new EmbedBuilder().setColor("Red").setDescription(`${error_emote} An unexpected error occurred while trying to clear warnings. Please try again later.\n\nIf this issue persists, please join the support server: ${supportinvite}`);
      await message.reply({ embeds: [embed] });
    }
  },
};
