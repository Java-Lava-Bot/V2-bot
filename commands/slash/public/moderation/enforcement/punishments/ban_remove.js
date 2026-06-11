const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban-remove")
    .setDescription("Unban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) => option.setName("userid").setDescription("The user ID you want to unban").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for unbanning the user")),

  async execute(interaction, client) {
    const userID = interaction.options.getString("userid");
    const reason = (interaction.options.getString("reason") || "No reason given.").substring(0, 500);

    // Check permissions using PermissionFlagsBits
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: `${error_emote} You don't have permission to unban members.`, flags: MessageFlags.Ephemeral });
    }

    // Prevent self-unban attempt
    if (interaction.member.id === userID) {
      return interaction.reply({ content: `${error_emote} You can't unban yourself.`, flags: MessageFlags.Ephemeral });
    }

    // Fetch bans
    let bannedUser;
    try {
      const existingBans = await interaction.guild.bans.fetch(userID.id).catch(() => null);
      if (existingBans.size === 0) {
        return interaction.reply({ content: `${warning_emote} No one is currently banned in this server.`, flags: MessageFlags.Ephemeral });
      }

      bannedUser = existingBans.get(userID);
      if (!bannedUser) {
        return interaction.reply({ content: `${warning_emote} This user is not banned from the server.`, flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      logger.error(error, client);
      LogError(error, interaction, "ban_remove");
      return interaction.reply({ content: `${error_emote} I couldn't fetch bans. Please join our support server for help: ${supportinvite}`, flags: MessageFlags.Ephemeral });
    }

    // Try unbanning
    try {
      await interaction.guild.bans.remove(userID, reason);
    } catch (error) {
      logger.error(error, client);
      LogError(error, interaction, "ban_remove");
      return interaction.reply({
        content: `${error_emote} An error occurred while unbanning the user, this could be due to me not having the "Ban Members" permission (which unbanning requires) or a Discord API error. Please join our support server for help: ${supportinvite}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Final success embed
    const embed = new EmbedBuilder().setColor("DarkAqua").setDescription(`${success_emote} <@${userID}> has been unbanned | ${reason}`);

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
