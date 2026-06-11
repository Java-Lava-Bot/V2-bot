const { EmbedBuilder } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote } = require("../../../../utils/emotes");

module.exports = {
  name: "avatar",
  aliases: ["pfp", "icon"],

  /**
   * Prefix usage:
   *   !avatar
   *   !avatar @user
   *   !avatar <userId>
   *
   * Expected handler contract:
   *   execute(message, args)
   */
  async execute(message, args) {
    try {
      if (!message.guild) {
        // Still works in DMs too, but keeping behavior explicit
        // (You can remove this if you want DM support.)
      }

      // Resolve target user:
      // Priority: mention -> ID -> fallback to author
      const mentioned = message.mentions.users.first() ?? null;

      let targetUser = mentioned;

      if (!targetUser) {
        const maybeId = args?.[0];
        if (maybeId && /^\d{15,21}$/.test(maybeId)) {
          targetUser = await message.client.users.fetch(maybeId).catch(() => null);
        }
      }

      if (!targetUser) targetUser = message.author;

      const avatarUrl = targetUser.displayAvatarURL({
        extension: "png",
        size: 1024,
        forceStatic: false, // allows animated if available
      });

      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.tag}'s Avatar`)
        .setImage(avatarUrl)
        .setColor("Blurple")
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing avatar (prefix) command:", error);

      // Mirror your existing logging style (but with message instead of interaction)
      try {
        LogError(error, message, "Prefix Command", "avatar");
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
