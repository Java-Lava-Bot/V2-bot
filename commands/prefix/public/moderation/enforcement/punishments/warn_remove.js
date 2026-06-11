const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const warningData = require("../../../../../../schema/warn");

module.exports = {
  name: "warnremove",
  aliases: ["unwarn", "removewarn"],
  description: "Remove a specific warning from a user",
  usage: "!warnremove <@user> <warn_id> [reason]",
  permissions: [PermissionsBitField.Flags.KickMembers],

  async execute(message, args, client) {
    const contextPrefix = `[WarnRemove-Prefix][guild=${message.guild?.id ?? "unknown"}][chan=${message.channel?.id ?? "unknown"}][executor=${message.author?.id ?? "unknown"}]`;

    try {
      // Check permissions
      if (!message.member?.permissions?.has(PermissionsBitField.Flags.KickMembers)) {
        logger.warn(`${contextPrefix} Missing permission KickMembers. executor=${message.author?.tag}`);
        return await message.reply({
          content: `${warning_emote} You can't execute this command because you don't have the **KICK MEMBERS** permission!`,
        });
      }

      // Parse mentioned user
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return await message.reply({
          content: `${error_emote} Please mention a user!\n**Usage:** \`!warnremove @user <warn_id> [reason]\``,
        });
      }

      // Parse warn ID
      const warnId = parseInt(args[1]);
      if (isNaN(warnId) || warnId < 1) {
        return await message.reply({
          content: `${error_emote} Please provide a valid warning ID!\n**Usage:** \`!warnremove @user <warn_id> [reason]\`\n**Example:** \`!warnremove @user 1 Mistake\``,
        });
      }

      // Get reason (everything after warn ID)
      const reason = args.slice(2).join(" ") || "No reason given.";

      // Find the specific warning
      const warning = await warningData
        .findOne({
          guildId: message.guild.id,
          userId: targetUser.id,
          warnId: warnId,
          active: true,
        })
        .lean()
        .exec();

      if (!warning) {
        return await message.reply({
          content: `${warning_emote} Could not find an active warning with ID **#${warnId}** for **${targetUser.tag}**.\n\nUse \`!warnings @user\` to see all active warnings.`,
        });
      }

      // Remove warning (set to inactive)
      await warningData.updateOne(
        {
          guildId: message.guild.id,
          userId: targetUser.id,
          warnId: warnId,
        },
        {
          $set: {
            active: false,
            removedBy: message.author.id,
            removedAt: new Date(),
            removeReason: reason,
          },
        },
      );

      // Count remaining warnings
      const remainingWarnings = await warningData.countDocuments({
        guildId: message.guild.id,
        userId: targetUser.id,
        active: true,
      });

      // Try to fetch moderator who issued the warning
      let moderatorname = "Unknown Moderator";
      try {
        const moderator = await client.users.fetch(warning.moderatorId);
        moderatorname = moderator.tag;
      } catch (e) {
        logger.warn(`${contextPrefix} Could not fetch moderator ${warning.moderatorId}`);
      }

      // Send DM to user
      const dmEmbed = new EmbedBuilder().setColor("DarkGreen").setDescription(`${success_emote} A warning in **${message.guild.name}** has been removed\n\n**Warning ID:** #${warnId}\n**Original Reason:** ${warning.reason}\n**Removal Reason:** ${reason}\n**Remaining Warnings:** ${remainingWarnings}`);

      try {
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmErr) {
        logger.warn(`${contextPrefix} Failed to DM target=${targetUser?.id} (${targetUser?.tag}) about warn removal: ${dmErr?.message ?? dmErr}`);
      }

      // Build response embed
      const embed = new EmbedBuilder().setColor("Green").setDescription(`${success_emote} Successfully removed warning **#${warnId}** from **${targetUser.tag}**\n\n**Original Warning:**\nIssued by: ${moderatorname}\nReason: ${warning.reason}\n\n**Removal Reason:** ${reason}\n**Remaining Warnings:** ${remainingWarnings}`);

      await message.reply({ embeds: [embed] });

      logger.info(`${contextPrefix} Removed warning #${warnId} for target=${targetUser?.id} (${targetUser?.tag}) reason="${reason}" by executor=${message.author?.tag}. Remaining: ${remainingWarnings}`);
    } catch (err) {
      logger.error(`${contextPrefix} Unexpected error: ${err?.message ?? err}`);
      LogError(err, message, "WarnRemove-Prefix");
      const embed = new EmbedBuilder().setColor("Red").setDescription(`${error_emote} An unexpected error occurred while trying to remove the warning. Please try again later.\n\nIf this issue persists, please join the support server: ${supportinvite}`);
      await message.reply({ embeds: [embed] });
    }
  },
};
