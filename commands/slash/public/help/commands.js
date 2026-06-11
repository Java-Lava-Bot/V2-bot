const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../utils/LogError");
const { logger } = require("../../../../utils/logger");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote, support_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("beta-commands")
    .setDescription("Provides a list of available commands in the beta version of the bot.")
    .addStringOption((option) => option.setName("category").setDescription("Select a command category to view its commands").setRequired(true).addChoices({ name: "community", value: "community" }, { name: "fun", value: "fun" }, { name: "moderation", value: "moderation" }, { name: "utility", value: "utility" }, { name: "help", value: "help" }))
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction) {
    try {
      const category = interaction.options.getString("category");
      let description = "";
      if (category) {
        description = `Here are the available commands in the **${category}** category:\n\n`;
        // Add commands for each category (this is just an example, you can customize it based on your actual commands)
        if (category === "community") {
          const communityCommands = [
            { name: "/clicker", description: "Play a simple clicking game to make the count go higher." },
            { name: "/poll", description: "Create a poll for your community to vote on." },
          ];
          const communityembed = new EmbedBuilder()
            .setTitle(`${support_emote} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(description + communityCommands.map((cmd) => `**${cmd.name}**: ${cmd.description}`).join("\n"))
            .setColor("#00FF00");
          await interaction.reply({ embeds: [communityembed] });
        } else if (category === "fun") {
          const funCommands = [
            { name: "/8ball", description: "Ask the magic 8-ball a question and get a random answer." },
            { name: "/joke", description: "Get a random joke to brighten your day." },
            { name: "/meme", description: "Receive a random meme for some laughs." },
            { name: "/poke", description: "Playfully poke the bot." },
          ];
          const funembed = new EmbedBuilder()
            .setTitle(`${support_emote} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(description + funCommands.map((cmd) => `**${cmd.name}**: ${cmd.description}`).join("\n"))
            .setColor("#00FF00");
          await interaction.reply({ embeds: [funembed] });
        } else if (category === "moderation") {
          const moderationCommands = [
            { name: "/warn_clear", description: "Clear all warnings for a user." },
            { name: "/warn_list", description: "List all warnings for a user." },
            { name: "/warn_remove", description: "Remove a specific warning from a user." },
            { name: "/warn", description: "Issue a warning to a user." },
            { name: "/ban", description: "Ban a user from the server." },
            { name: "/ban_remove", description: "Remove a ban from a user." },
            { name: "/ban_soft", description: "Soft ban a user (kick and delete messages)." },
            { name: "/ban_temp", description: "Temporarily ban a user from the server." },
            { name: "/lock_channel", description: "Lock a channel to prevent users from sending messages." },
            { name: "/lock_channel_remove", description: "Unlock a channel to allow users to send messages again." },
            { name: "/lock_server", description: "Lock the entire server to prevent users from sending messages." },
            { name: "/lock_server_remove", description: "Unlock the entire server to allow users to send messages again." },
            { name: "/kick", description: "Kick a user from the server." },
            { name: "/nickname", description: "Change a user's nickname." },
            { name: "/pruge", description: "Bulk delete messages in a channel." },
            { name: "/role_add", description: "Manage roles for users." },
            { name: "/role_remove", description: "Manage roles for users." },
            { name: "/slowmode", description: "Set slowmode for a channel." },
            { name: "/timeout", description: "Timeout a user for a specified duration." },
            { name: "/timeout_remove", description: "Remove timeout from a user." },
            { name: "/report_setup", description: "Set up the report system for the server." },
            { name: "/report", description: "Report a user to the moderators." },
          ];
          const moderationembed = new EmbedBuilder()
            .setTitle(`${support_emote} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(description + moderationCommands.map((cmd) => `**${cmd.name}**: ${cmd.description}`).join("\n"))
            .setColor("#00FF00");
          await interaction.reply({ embeds: [moderationembed] });
        } else if (category === "utility") {
          const utilityCommands = [
            { name: "/avatar", description: "Get the avatar of a user." },
            { name: "/debug", description: "Check bot performance, latency, and memory usage." },
            { name: "/invite-bot", description: "Invite Java Lava to your server today!" },
            { name: "/links", description: "Get important links related to the bot." },
            { name: "/reminder", description: "Set a reminder for yourself." },
            { name: "/serverinfo", description: "Get information about the server." },
            { name: "/study-buddy", description: "Start a study session with the bot." },
            { name: "/userinfo", description: "Get information about a user." },
          ];
          const utilityembed = new EmbedBuilder()
            .setTitle(`${support_emote} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(description + utilityCommands.map((cmd) => `**${cmd.name}**: ${cmd.description}`).join("\n"))
            .setColor("#00FF00");
          await interaction.reply({ embeds: [utilityembed] });
        } else if (category === "help") {
          const helpCommands = [
            { name: "/beta-about", description: "Learn about the beta version of Java Lava." },
            { name: "/beta-commands", description: "Provides a list of available commands in the beta version of the bot." },
            { name: "/beta-help", description: "Provides help information for the beta version of the bot." },
          ];
          const helpembed = new EmbedBuilder()
            .setTitle(`${support_emote} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(description + helpCommands.map((cmd) => `**${cmd.name}**: ${cmd.description}`).join("\n"))
            .setColor("#00FF00");
          await interaction.reply({ embeds: [helpembed] });
        }
      } else {
        description = "Here are the available command categories:\n\n- **community**: Commands related to community engagement and interaction.\n- **fun**: Commands for entertainment and fun activities.\n- **moderation**: Commands for server moderation and management.\n- **utility**: Useful commands for various purposes.\n\nUse `/beta-commands [category]` to view commands in a specific category.";
      }
    } catch (error) {
      logger.error("Error executing beta-commands command:", error);
      LogError(error, interaction, "Slash Command", "beta-commands");
      const errorEmbed = new EmbedBuilder().setTitle(`${error_emote} An error occurred`).setDescription(`Sorry, something went wrong while executing the command. Please try again later, or contact support if the issue persists. support server: ${supportinvite}`).setColor("#FF0000");
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  },
};
