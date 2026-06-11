const { ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { error_emote } = require("../../../../utils/emotes");
const Clicker = require("../../../../schema/clicker");

module.exports = {
  name: "clicker",
  description: "Hit the button and increase the count.",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.ReadMessageHistory],
  },
  execute: async (message, args, client) => {
    try {
      const clicker = await Clicker.findOneAndUpdate({ guildId: message.guild.id }, { $setOnInsert: { totalClicks: 0 } }, { new: true, upsert: true });

      if (!clicker) {
        logger.error(`[prefix:clicker] Failed to create/retrieve clicker document for guild: ${message.guild.id}`);
        const errorEmbed = new EmbedBuilder().setColor("Red").setTitle("An error has occurred").setDescription(`${error_emote} An error occurred while initializing the clicker. Please try again later.`);
        return message.reply({ embeds: [errorEmbed] });
      }

      const row = new ActionRowBuilder().addComponents([new ButtonBuilder().setCustomId("clicker").setLabel("Click Me!").setStyle(ButtonStyle.Primary)]);

      await message.reply({ content: `Total clicks: ${clicker.totalClicks}`, components: [row] });

      logger.info(`[prefix:clicker] Successfully loaded clicker for guild: ${message.guild.id} (${clicker.totalClicks} clicks)`);
    } catch (error) {
      logger.error(`[prefix:clicker] Error in execute function:`, error);
      LogError(error, client, "prefix/clicker");
      const errorEmbed = new EmbedBuilder().setColor("Red").setTitle("An error has occurred").setDescription(`${error_emote} An error occurred while processing your request. Please try again later.`);
      message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
  },
};
