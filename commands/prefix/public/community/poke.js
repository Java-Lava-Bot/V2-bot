const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");

module.exports = {
  name: "poke",
  description: "Poke the bot!",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.ReadMessageHistory],
  },
  execute: async (message, args, client) => {
    try {
      const button = new ButtonBuilder().setCustomId("poke").setStyle(ButtonStyle.Primary).setLabel("Poke me!");

      const row = new ActionRowBuilder().addComponents(button);

      await message.reply({ content: "Poke me!", components: [row] });
    } catch (error) {
      logger.error("[prefix:poke] Error handling poke command:", error);
      LogError(error, client, "prefix/poke");
    }
  },
};
