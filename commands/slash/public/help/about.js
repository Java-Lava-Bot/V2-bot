const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../utils/LogError");
const { logger } = require("../../../../utils/logger");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote, info_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder().setName("beta-about").setDescription("Learn about the beta version of Java Lava.").setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle(`About Java Lava Standard ${info_emote}`)
        .setDescription("Java Lava is a multi use discord bot that offers a variety of features for different types of servers. Java Lava is also made with student perks made in mind to help students with their studies. The beta version is a testing ground for new features and improvements before they are released in the stable version.")
        .addFields({ name: "Purpose", value: "The beta version allows us to test new features and gather user feedback before they are released in the stable version." }, { name: "Stability", value: "As this is an beta release, it may be unstable and contain bugs. Please report any issues you encounter to our support server." }, { name: "Updates", value: `We will be regularly updating the beta version with new features and improvements. Stay tuned for updates in our support server: [Support Server Invite](${supportinvite})` });
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing beta-about command:", error);
      LogError(error, interaction, "Slash Command", "beta-about");
      const errorEmbed = new EmbedBuilder().setTitle(`${error_emote} An error occurred`).setDescription("Sorry, something went wrong while executing the command. Please try again later or contact support if the issue persists.").setColor("#FF0000");
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
