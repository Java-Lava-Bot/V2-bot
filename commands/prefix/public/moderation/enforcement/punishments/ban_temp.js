const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ms = require("ms");
const Tempban = require("../../../../../../schema/tempban");
const { logger } = require("../../../../../../utils/logger");
const { LogError } = require("../../../../../../utils/LogError");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, banned_emote } = require("../../../../../../utils/emotes");

module.exports = {
  name: "ban-temp",
  aliases: ["tempban", "tban"],
  /**
   * Usage (example):
   * !ban-temp @user 10m [reason...]
   * !ban-temp <userId> 2h [reason...]
   *
   * Note: this prefix version defaults deleteDays to 0.
   * If you want deleteDays too: !ban-temp @user 10m 7 [reason...]
   */
  execute: async (message, args) => {
    try {
      if (!message.member?.permissions?.has(PermissionFlagsBits.BanMembers)) {
        return message.reply({ content: `${warning_emote} You don't have permission to ban members.` });
      }

      // user (mention OR ID)
      const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

      if (!target) {
        return message.reply({
          content: `${warning_emote} Please mention a user or provide a user ID.\nExample: \`!ban-temp @user 10m spamming\``,
        });
      }

      if (message.author.id === target.id) {
        return message.reply({ content: `${error_emote} You can't temp ban yourself.` });
      }

      const durationStr = args[1];
      if (!durationStr) {
        return message.reply({ content: `${warning_emote} Please provide a duration.\nExample: \`!ban-temp @user 10m spamming\`` });
      }

      const duration = ms(durationStr);
      if (!duration || duration <= 0) {
        return message.reply({ content: `${warning_emote} Invalid duration: \`${durationStr}\` (examples: 10m, 2h, 3d).` });
      }

      // Optional deleteDays parsing:
      // If args[2] is a number 0-7, treat it as deleteDays; otherwise deleteDays=0 and args[2+] is reason.
      let deleteDays = 0;
      let reasonStartIndex = 2;

      const maybeDeleteDays = parseInt(args[2], 10);
      if (!Number.isNaN(maybeDeleteDays) && maybeDeleteDays >= 0 && maybeDeleteDays <= 7) {
        deleteDays = maybeDeleteDays;
        reasonStartIndex = 3;
      }

      const reason = args.slice(reasonStartIndex).join(" ") || "No reason given.";

      // DM attempt first (non-fatal)
      const dmEmbed = new EmbedBuilder().setColor("Red").setDescription(`${banned_emote} You have been temporarily banned from **${message.guild.name}** | ${reason}`);

      try {
        await target.send({ embeds: [dmEmbed] });
      } catch (err) {
        logger.error(`Could not send ban DM to ${target.tag}.`, err);
        LogError(err, message, message.client, "Prefix Command", "ban-temp");
      }

      // Already banned check
      const bans = await message.guild.bans.fetch();
      const alreadyBanned = bans.has(target.id);
      if (alreadyBanned) {
        const alreadyBannedEmbed = new EmbedBuilder().setColor("Orange").setDescription(`${warning_emote} ${target.tag} is already banned from the server.`);
        return message.reply({ embeds: [alreadyBannedEmbed], allowedMentions: { repliedUser: false } });
      }

      // Persist tempban record (your existing unban scheduler should handle unbanning later)
      await Tempban.create({
        Guild: message.guild.id,
        User: target.id,
        BanTime: Date.now() + duration,
      });

      // Ban
      await message.guild.bans.create(target.id, { reason, deleteMessageSeconds: deleteDays * 86400 }).catch((err) => {
        logger.error(err);
        LogError(err, message, message.client, "Prefix Command", "ban-temp");
        throw err;
      });

      const successEmbed = new EmbedBuilder().setColor("Green").setTitle(`${success_emote} User Temporarily Banned`).setDescription(`${success_emote} Successfully temporarily banned ${target.tag} for \`${durationStr}\`.\n**Reason:** ${reason}\n**Delete days:** ${deleteDays}`);

      return message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      const errorEmbed = new EmbedBuilder().setColor("Red").setTitle(`${error_emote} Error Temporarily Banning User`).setDescription(`${error_emote} An error occurred while temporarily banning the user. Please ensure I have the "Ban Members" permission and try again.\n\nSupport: ${supportinvite}`);

      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }
  },
};
