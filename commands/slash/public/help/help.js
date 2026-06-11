const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../utils/LogError");
const { logger } = require("../../../../utils/logger");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, support_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder().setName("beta-help").setDescription("Provides help information for the beta version of the bot.").setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle(`Java Lava Standard Help Center ${support_emote}`)
        .setDescription("This is the help command for the beta version of the bot. Here you can find information about the available commands and how to use them.")
        .addFields({ name: "Java Lava Standard", value: "This is the beta version of the bot. It is still in development and may contain bugs. Please report any issues you encounter to the support server." }, { name: "Available Commands", value: "The available commands in the beta version may be limited. You can run the /readyb-commands command to see all available commands." }, { name: "Support", value: `If you need help or want to report a bug, please join our support server: [Support Server Invite](${supportinvite})` })
        .setColor("#FF5733")
        .setFooter({ text: "Thank you for using Java Lava!" });
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing beta-help command:", error);
      LogError(error, interaction, "Slash Command", "beta-help");
      const errorEmbed = new EmbedBuilder().setTitle(`${error_emote} An error occurred`).setDescription("Sorry, something went wrong while executing the command. Please try again later or contact support if the issue persists.").setColor("#FF0000");
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
