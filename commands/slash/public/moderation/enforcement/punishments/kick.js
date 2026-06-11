const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../../utils/logger");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, kicked_emote } = require("../../../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("kick a user from the server")
    .addUserOption((option) => option.setName("target").setDescription("The user you would like to kick out of the server").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("The reason for kicking the user"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    // Defer immediately so all follow-ups can use editReply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const kickUser = interaction.options.getUser("target");
    const reason = (interaction.options.getString("reason") || "No reason given.").substring(0, 500);

    // Fetch may throw if the user is not in the guild
    let kickMember;
    try {
      kickMember = await interaction.guild.members.fetch(kickUser.id);
    } catch {
      return interaction.editReply({
        content: `${warning_emote} The user mentioned is not in the server.`,
      });
    }

    if (interaction.member.id === kickMember.id) {
      return interaction.editReply({
        content: `${warning_emote} You cannot kick yourself!`,
      });
    }

    if (!kickMember.kickable) {
      return interaction.editReply({
        content: `${warning_emote} I can't kick this user because they have a role above me or you.`,
      });
    }

    const dmEmbed = new EmbedBuilder().setColor("DarkOrange").setDescription(`${kicked_emote} You have been kicked from **${interaction.guild.name}** | ${reason}`);

    const embed = new EmbedBuilder().setColor("Navy").setDescription(`${success_emote} ${kickUser.username} has been **kicked** | ${reason}`);

    // DM failure should not fail the command
    await kickMember.send({ embeds: [dmEmbed] }).catch(() => {});

    try {
      await kickMember.kick(reason);
    } catch (error) {
      logger.error(error, client);
      LogError(error, interaction, "kick");
      return interaction.editReply({
        content: `${error_emote} An error occurred while kicking the user due to a possible API error or missing "Kick Members" permission. Please join our support server for help: ${supportinvite}`,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
