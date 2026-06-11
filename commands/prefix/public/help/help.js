const { EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../utils/LogError");
const { logger } = require("../../../../utils/logger");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote, support_emote } = require("../../../../utils/emotes");

module.exports = {
  name: "help",

  /**
   * Prefix usage:
   *   !help
   *
   * Expected handler contract:
   *   execute(message, args)
   */
  async execute(message) {
    try {
      const embed = new EmbedBuilder()
        .setTitle(`Java Lava Standard Help Center ${support_emote}`)
        .setDescription("This is the help command for the beta version of the bot. Here you can find information about the available commands and how to use them.")
        .addFields(
          {
            name: "Java Lava Standard",
            value: "This is the beta version of the bot. It is still in development and may contain bugs. Please report any issues you encounter to the support server.",
          },
          {
            name: "Available Commands",
            value: "The available commands in the beta version may be limited. You can run the /commands or j.commands command to see all available commands.",
          },
          {
            name: "Support",
            value: `If you need help or want to report a bug, please join our support server: ${supportinvite}`,
          },
        )
        .setColor("#FF5733")
        .setFooter({ text: "Thank you for using Java Lava!" });

      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing beta-help (prefix) command:", error);

      // Mirror your slash error logging style; pass message instead of interaction
      try {
        LogError(error, message, "Prefix Command", "beta-help");
      } catch {
        // ignore secondary logging errors
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle(`${error_emote} An error occurred`)
        .setDescription(`Sorry, something went wrong while executing the command. Please try again later or contact support if the issue persists.\n` + `support server: ${supportinvite}`)
        .setColor("#FF0000");

      return message.reply({ embeds: [errorEmbed] });
    }
  },
};
