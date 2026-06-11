const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, banned_emote } = require("../../../../../../utils/emotes");

module.exports = {
  name: "ban-soft",
  aliases: ["softban"],
  /**
   * Usage (example):
   * !ban-soft @user [reason...]
   */
  execute: async (message, args) => {
    try {
      // Permission check (member may be null in some edge cases)
      if (!message.member?.permissions?.has(PermissionFlagsBits.BanMembers)) {
        return message.reply({ content: `${warning_emote} You don't have permission to ban members.` });
      }

      // Resolve user (mention OR raw ID)
      const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

      if (!target) {
        return message.reply({ content: `${warning_emote} Please mention a user or provide a user ID.\nExample: \`!ban-soft @user spamming\`` });
      }

      // Prevent self-soft-ban attempt
      if (message.author.id === target.id) {
        return message.reply({ content: `${error_emote} You can't soft ban yourself.` });
      }

      const reason = args.slice(1).join(" ") || "No reason given.";

      // Softban = ban (delete 1 second of messages) then unban
      await message.guild.members.ban(target.id, { reason, deleteMessageSeconds: 1 });
      await message.guild.members.unban(target.id, reason);

      // DM attempt (non-fatal)
      const dmEmbed = new EmbedBuilder().setColor("Red").setDescription(`${banned_emote} You have been soft banned from **${message.guild.name}** | ${reason}`);

      try {
        await target.send({ embeds: [dmEmbed] });
      } catch (err) {
        logger.error(`Could not send ban DM to ${target.tag}.`, err);
        LogError(err, message, message.client, "Prefix Command", "ban-soft");
      }

      const embed = new EmbedBuilder().setTitle(`${success_emote} User Soft Banned`).setDescription(`User ID: ${target.id} has been soft banned.\nReason: ${reason}`).setColor("#00FF00").setTimestamp();

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      logger.error("Error executing ban-soft command:", error);
      LogError(error, message, message.client, "Prefix Command", "ban-soft");

      return message.reply({
        content: `${error_emote} An error occurred while soft banning the user. This could be due to me not having the "Ban Members" permission or a Discord API error.\nSupport: ${supportinvite}`,
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
