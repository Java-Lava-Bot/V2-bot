const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, banned_emote } = require("../../../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban-soft")
    .setDescription("Soft bans a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName("user").setDescription("The user you want to soft ban").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for soft banning the user")),

  async execute(interaction, client) {
    const user = interaction.options.getUser("user");
    const reason = (interaction.options.getString("reason") || "No reason given.").substring(0, 500);

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: `${warning_emote} You don't have permission to ban members.`, flags: MessageFlags.Ephemeral });
    }

    if (interaction.member.id === user.id) {
      return interaction.reply({ content: `${error_emote} You can't soft ban yourself.`, flags: MessageFlags.Ephemeral });
    }

    try {
      await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds: 1 });
      await interaction.guild.members.unban(user.id, reason);

      const dmEmbed = new EmbedBuilder().setColor("Red").setDescription(`${banned_emote} You have been soft banned from **${interaction.guild.name}** | ${reason}`);

      try {
        await user.send({ embeds: [dmEmbed] });
      } catch (err) {
        logger.error(`Could not send ban DM to ${user.tag}.`, client);
        LogError(err, client);
      }

      const embed = new EmbedBuilder().setTitle(`${success_emote} User Soft Banned`).setDescription(`User ID: ${user.id} has been soft banned.\nReason: ${reason}`).setColor("#00FF00").setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(error, client);
      LogError(error, interaction, "ban_soft");
      return interaction.reply({
        content: `${error_emote} An error occurred while soft banning the user, this could be due to me not having the "Ban Members" permission or a Discord API error. Please join our support server for help: ${supportinvite}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
