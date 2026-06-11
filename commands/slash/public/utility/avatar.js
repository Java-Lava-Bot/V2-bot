const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get the avatar of a user")
    .addUserOption((option) => option.setName("target").setDescription("The user to get the avatar of").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("target") || interaction.user;
      const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.tag}'s Avatar`)
        .setImage(avatarUrl)
        .setColor("Blurple")
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing beta-avatar command:", error);
      LogError(error, interaction, "commands/slash/public/utility/avatar.js");
      const errorEmbed = new EmbedBuilder()
        .setTitle(`${error_emote} An error occurred`)
        .setDescription(`Sorry, something went wrong while executing the command. Please try again later or contact support if the issue persists.\n` + `support server: ${supportinvite}`)
        .setColor("#FF0000");
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  },
};
