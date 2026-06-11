const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { supportinvite } = require("../../../../utils/support-invite");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { error_emote } = require("../../../../utils/emotes");

module.exports = {
  name: "invite",
  description: "Invite Java Lava to your server today!",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    try {
      const inviteEmbed = new EmbedBuilder().setTitle("Invite Java Lava to Your Server!").setDescription(`Choose the bot you want to invite!`).addFields({ name: "Java Lava Standard", value: "[Invite Java Lava Standard](https://discord.com/oauth2/authorize?client_id=1305190785536360519&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fjavalava.phillsphanbh3.me%2F&integration_type=0&scope=identify+guilds+guilds.join+bot)", inline: true }, { name: "Java Lava Standard", value: "[Invite Java Lava Standard](https://discord.com/oauth2/authorize?client_id=1390723130904805376&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbetajavalava.phillsphanbh3.me%2F&integration_type=0&scope=identify+guilds+guilds.join+bot)", inline: true }).setColor("#00AAFF").setFooter({ text: "Thank you for choosing Java Lava!", iconURL: client.user.displayAvatarURL() });
      return message.reply({ embeds: [inviteEmbed] });
    } catch (error) {
      logger.error("Invite Bot Command Error:", error);
      LogError(error, client, "prefix/invite_bot");
      return message.reply(`${error_emote} An error occurred while trying to execute the command. Please try again later. If the issue persists, join our support server: ${supportinvite}`);
    }
  },
};
