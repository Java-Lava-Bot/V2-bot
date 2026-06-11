const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");
const warningData = require("../../../../../../schema/warn");

module.exports = {
  name: "warn",
  description: "Warn a user in the server",
  usage: "!warn <@user> [reason]",
  permissions: [PermissionsBitField.Flags.KickMembers],

  async execute(message, args, client) {
    const contextPrefix = `[Warn-Prefix][guild=${message.guild?.id ?? "unknown"}][chan=${message.channel?.id ?? "unknown"}][executor=${message.author?.id ?? "unknown"}]`;

    try {
      // Check permissions
      if (!message.member?.permissions?.has(PermissionsBitField.Flags.KickMembers)) {
        logger.warn(`${contextPrefix} Missing permission KickMembers. executor=${message.author?.tag}`);
        return await message.reply({
          content: `${warning_emote} You can't execute this command because you don't have the **KICK MEMBERS** permission!`,
        });
      }

      // Parse mentioned user
      const warnUser = message.mentions.users.first();
      if (!warnUser) {
        return await message.reply({
          content: `${error_emote} Please mention a user to warn!\n**Usage:** \`!warn @user [reason]\``,
        });
      }

      // Get reason (everything after the mention)
      const reason = args.slice(1).join(" ") || "No reason given.";

      // Fetch member
      let warnMember = null;
      try {
        warnMember = await message.guild.members.fetch(warnUser.id);
      } catch (fetchErr) {
        logger.error(`${contextPrefix} Failed to fetch member target=${warnUser?.id}: ${fetchErr?.message ?? fetchErr}`);
        LogError(fetchErr, message, "Warn-Prefix");
      }

      if (!warnMember) {
        logger.warn(`${contextPrefix} Target not in guild or fetch failed. target=${warnUser?.id}`);
        return await message.reply({
          content: `${warning_emote} The user mentioned is not in the server`,
        });
      }

      // Prevent warning bots
      if (warnUser.bot) {
        return await message.reply({
          content: `${warning_emote} You cannot warn bots!`,
        });
      }

      // Prevent self-warning
      if (warnUser.id === message.author.id) {
        return await message.reply({
          content: `${warning_emote} You cannot warn yourself!`,
        });
      }

      // Generate warn ID (auto-increment per user in guild)
      const existingWarnings = await warningData
        .find({
          guildId: message.guild.id,
          userId: warnUser.id,
        })
        .sort({ warnId: -1 })
        .limit(1)
        .lean()
        .exec();

      const warnId = existingWarnings.length > 0 ? existingWarnings[0].warnId + 1 : 1;

      // Save warning to database
      await warningData.create({
        guildId: message.guild.id,
        userId: warnUser.id,
        moderatorId: message.author.id,
        reason: reason,
        timestamp: new Date(),
        warnId: warnId,
        active: true,
      });

      // Count total active warnings
      const totalWarnings = await warningData.countDocuments({
        guildId: message.guild.id,
        userId: warnUser.id,
        active: true,
      });

      // Send DM to user
      const dmEmbed = new EmbedBuilder().setColor("DarkOrange").setDescription(`${warning_emote} You have been warned in the server **${message.guild.name}**\n\n**Reason:** ${reason}\n**Warning ID:** #${warnId}\n**Total Warnings:** ${totalWarnings}`);

      let dmSent = false;
      try {
        await warnMember.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch (dmErr) {
        logger.warn(`${contextPrefix} Failed to DM target=${warnUser?.id} (${warnUser?.tag}): ${dmErr?.message ?? dmErr}`);
      }

      // Build response embed
      const embed = new EmbedBuilder().setColor("Navy").setDescription(`${success_emote} ${warnUser.tag} has been **warned** | ${reason}\n\n**Warning ID:** #${warnId}\n**Total Warnings:** ${totalWarnings}${!dmSent ? "\n⚠️ *Could not DM user*" : ""}`);

      await message.reply({ embeds: [embed] });

      logger.info(`${contextPrefix} Warned target=${warnUser?.id} (${warnUser?.tag}) warnId=${warnId} totalWarnings=${totalWarnings} reason="${reason}" by executor=${message.author?.tag}`);

      // Auto-moderation actions
      try {
        if (totalWarnings >= 5) {
          await warnMember.ban({ reason: `Automatic ban: Reached 5 warnings` });

          const banEmbed = new EmbedBuilder().setColor("Red").setDescription(`🔨 ${warnUser.tag} has been **automatically banned** for reaching 5 warnings.`);

          await message.channel.send({ embeds: [banEmbed] });
          logger.info(`${contextPrefix} Auto-banned user=${warnUser?.tag} for reaching 5 warnings`);
        } else if (totalWarnings >= 3) {
          await warnMember.kick(`Automatic kick: Reached 3 warnings`);

          const kickEmbed = new EmbedBuilder().setColor("Orange").setDescription(`👢 ${warnUser.tag} has been **automatically kicked** for reaching 3 warnings.`);

          await message.channel.send({ embeds: [kickEmbed] });
          logger.info(`${contextPrefix} Auto-kicked user=${warnUser?.tag} for reaching 3 warnings`);
        }
      } catch (actionErr) {
        logger.error(`${contextPrefix} Failed to execute auto-moderation action: ${actionErr?.message ?? actionErr}`);
        await message.channel
          .send({
            content: `${error_emote} Failed to execute automatic moderation action. Please check bot permissions.`,
          })
          .catch(() => {});
      }
    } catch (err) {
      logger.error(`${contextPrefix} Unexpected error: ${err?.message ?? err}`);
      LogError(err, message, "Warn-Prefix");
      const embed = new EmbedBuilder().setColor("Red").setDescription(`${error_emote} An unexpected error occurred while trying to warn a user. Please try again later.\n\nIf this issue persists, please join the support server: ${supportinvite}`);
      await message.reply({ embeds: [embed] });
    }
  },
};
