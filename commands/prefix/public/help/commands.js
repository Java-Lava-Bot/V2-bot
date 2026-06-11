const { EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../utils/LogError");
const { logger } = require("../../../../utils/logger");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote, support_emote } = require("../../../../utils/emotes");

module.exports = {
  name: "commands",

  /**
   * Prefix usage:
   *   !commands <category>
   *
   * Categories:
   *   community | fun | moderation | utility | help-cmds
   *
   * Expected handler contract:
   *   execute(message, args)
   */
  async execute(message, args) {
    try {
      const category = (args[0] || "").toLowerCase();

      const categories = new Set(["community", "fun", "moderation", "utility", "help-cmds"]);

      // If no category provided (or invalid), show categories list/help
      if (!category || !categories.has(category)) {
        const infoEmbed = new EmbedBuilder()
          .setTitle(`${support_emote} Commands`)
          .setDescription(["Here are the available command categories:\n", "- **community**: Commands related to community engagement and interaction.", "- **fun**: Commands for entertainment and fun activities.", "- **moderation**: Commands for server moderation and management.", "- **utility**: Useful commands for various purposes.", "- **help-cmds**: Help and info commands.", "", `Use \`${message.content.split(/\s+/)[0]} <category>\` to view commands in a specific category.`, "", "Example:", `\`${message.content.split(/\s+/)[0]} moderation\``].join("\n"))
          .setColor("#00FF00");

        return message.reply({ embeds: [infoEmbed] });
      }

      let commands = [];

      if (category === "community") {
        commands = [
          { name: "clicker", description: "Play a simple clicking game to make the count go higher." },
          { name: "poll", description: "Create a poll for your community to vote on." },
        ];
      } else if (category === "fun") {
        commands = [
          { name: "8ball", description: "Ask the magic 8-ball a question and get a random answer." },
          { name: "joke", description: "Get a random joke to brighten your day." },
          { name: "meme", description: "Receive a random meme for some laughs." },
          { name: "poke", description: "Playfully poke the bot." },
        ];
      } else if (category === "moderation") {
        commands = [
          { name: "warn_clear", description: "Clear all warnings for a user." },
          { name: "warn_list", description: "List all warnings for a user." },
          { name: "warn_remove", description: "Remove a specific warning from a user." },
          { name: "warn", description: "Issue a warning to a user." },
          { name: "ban", description: "Ban a user from the server." },
          { name: "ban_remove", description: "Remove a ban from a user." },
          { name: "ban_soft", description: "Soft ban a user (kick and delete messages)." },
          { name: "ban_temp", description: "Temporarily ban a user from the server." },
          { name: "lock_channel", description: "Lock a channel to prevent users from sending messages." },
          { name: "lock_channel_remove", description: "Unlock a channel to allow users to send messages again." },
          { name: "lock_server", description: "Lock the entire server to prevent users from sending messages." },
          { name: "lock_server_remove", description: "Unlock the entire server to allow users to send messages again." },
          { name: "kick", description: "Kick a user from the server." },
          { name: "nickname", description: "Change a user's nickname." },
          { name: "pruge", description: "Bulk delete messages in a channel." }, // keeping original typo to match your code
          { name: "role_add", description: "Manage roles for users." },
          { name: "role_remove", description: "Manage roles for users." },
          { name: "slowmode", description: "Set slowmode for a channel." },
          { name: "timeout", description: "Timeout a user for a specified duration." },
          { name: "timeout_remove", description: "Remove timeout from a user." },
          { name: "report_setup", description: "Set up the report system for the server." },
          { name: "report", description: "Report a user to the moderators." },
        ];
      } else if (category === "utility") {
        commands = [
          { name: "avatar", description: "Get the avatar of a user." },
          { name: "debug", description: "Check bot performance, latency, and memory usage." },
          { name: "invite-bot", description: "Invite Java Lava to your server today!" },
          { name: "links", description: "Get important links related to the bot." },
          { name: "reminder", description: "Set a reminder for yourself." },
          { name: "serverinfo", description: "Get information about the server." },
          { name: "study-buddy", description: "Start a study session with the bot." },
          { name: "userinfo", description: "Get information about a user." },
        ];
      } else if (category === "help-cmds") {
        commands = [
          { name: "beta-about", description: "Learn about the beta version of Java Lava." },
          { name: "beta-commands", description: "Provides a list of available commands in the beta version of the bot." },
          { name: "beta-help", description: "Provides help information for the beta version of the bot." },
        ];
      }

      // Try to infer prefix from the message (works with most handlers that pass raw message)
      const inferredPrefix = (message.content.match(/^\S+/)?.[0] || "!").split("")[0]; // crude fallback
      const prettyCategory = category.charAt(0).toUpperCase() + category.slice(1);

      const description = `Here are the available commands in the **${category}** category:\n\n` + commands.map((cmd) => `**${inferredPrefix}${cmd.name}**: ${cmd.description}`).join("\n");

      const embed = new EmbedBuilder().setTitle(`${support_emote} ${prettyCategory} Commands`).setDescription(description).setColor("#00FF00");

      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing commands (prefix) command:", error);

      // Keep your existing error logging style.
      // LogError signature in your slash cmd is: LogError(error, interaction, type, name)
      // For prefix we don’t have an interaction; pass message instead.
      try {
        LogError(error, message, "Prefix Command", "commands");
      } catch {
        // ignore secondary logging errors
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle(`${error_emote} An error occurred`)
        .setDescription(`Sorry, something went wrong while executing the command. Please try again later, or contact support if the issue persists.\n` + `support server: ${supportinvite}`)
        .setColor("#FF0000");

      return message.reply({ embeds: [errorEmbed] });
    }
  },
};
