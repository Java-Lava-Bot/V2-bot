const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const ms = require("ms");
const Tempban = require("../../../../../../schema/tempban");
const { logger } = require("../../../../../../utils/logger");
const { LogError } = require("../../../../../../utils/LogError");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, banned_emote } = require("../../../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban-temp")
    .setDescription("Temporarily ban a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName("user").setDescription("The user you want to temporarily ban").setRequired(true))
    .addStringOption((option) => option.setName("duration").setDescription("Duration of the temporary ban (e.g., 10m, 2h)").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the temporary ban"))
    .addIntegerOption((option) => option.setName("delete_days").setDescription("Number of days of messages to delete (0-7)").setMinValue(0).setMaxValue(7)),
  async execute(interaction, client) {
    const { options } = interaction;
    const user = options.getUser("user");
    const durationStr = options.getString("duration");
    const duration = ms(durationStr);
    const reason = options.getString("reason") || "No reason given.";
    const deleteDays = options.getInteger("delete_days") || 0;

    // Try to send DM first
    const dmEmbed = new EmbedBuilder().setColor("Red").setDescription(`${banned_emote} You have been temporarily banned from **${interaction.guild.name}** | ${reason}`);

    try {
      await user.send({ embeds: [dmEmbed] });
    } catch (err) {
      logger.error(`Could not send ban DM to ${user.tag}.`, client);
      LogError(err, interaction, "ban_temp");
      // Continue even if DM fails to the banned user message to moderator
    }

    const existingBan = await interaction.guild.bans.fetch(user.id).catch(() => null);

    var banned = false;
    await bans.forEach(async (ban) => {
      if (ban.user.id === user.id) {
        banned = true;
      }
    });

    if (existingBan || banned) {
      return await interaction.reply({ content: `${warning_emote} This user is already banned from the server.`, flags: MessageFlags.Ephemeral });
    }

    await Tempban.create({
      Guild: interaction.guild.id,
      User: user.id,
      BanTime: Date.now() + duration,
    });

    var error = false;
    await interaction.guild.bans.create(user.id, { reason: reason, deleteMessageSeconds: deleteDays * 86400 }).catch((err) => {
      error = true;
      logger.error(err, client);
      LogError(err, interaction, "ban_temp");
    });

    if (error) {
      const errorEmbed = new EmbedBuilder().setColor("Red").setTitle(`${error_emote} Error Temporarily Banning User`).setDescription(`${error_emote} An error occurred while temporarily banning the user. Please ensure I have the "Ban Members" permission and try again.\n\nJoin the support server: ${supportinvite}`);
      return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    } else {
      const successEmbed = new EmbedBuilder().setColor("Green").setTitle(`${success_emote} User Temporarily Banned`).setDescription(`${success_emote} Successfully temporarily banned ${user.tag} for \`${durationStr}\`.\n**Reason:** ${reason}`);
      return await interaction.reply({ embeds: [successEmbed] });
    }
  },
};
