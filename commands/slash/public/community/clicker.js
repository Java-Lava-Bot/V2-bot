const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../utils/LogError");
const { logger } = require("../../../../utils/logger");
const { error_emote } = require("../../../../utils/emotes");
const Clicker = require("../../../../schema/clicker");

module.exports = {
  data: new SlashCommandBuilder().setName("clicker").setDescription("Hit the button and increase the count"),
  execute: async (interaction, client) => {
    try {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
      }

      const guildId = interaction.guildId;

      const clickerData = await Clicker.findOneAndUpdate({ guildId }, { $setOnInsert: { totalClicks: 0 } }, { returnDocument: "after", upsert: true });

      if (!clickerData) {
        logger.error(`[clicker] Failed to create/retrieve clicker document for guild: ${guildId}`);
        const errorEmbed = new EmbedBuilder().setColor("Red").setTitle("An error has occurred").setDescription(`${error_emote} An error occurred while initializing the clicker. Please try again later.`);
        return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("clicker").setLabel("Click Me!").setStyle(ButtonStyle.Primary));

      await interaction.reply({
        content: `Total clicks: ${clickerData.totalClicks}`,
        components: [row],
      });

      logger.info(`[clicker] Successfully loaded clicker for guild: ${guildId} (${clickerData.totalClicks} clicks)`);
    } catch (error) {
      logger.error(`[clicker] Error in execute function:`, error);
      logger.error(`[clicker] Guild ID: ${interaction.guildId || "Unknown"}`);
      logger.error(`[clicker] User: ${interaction.user?.tag || "Unknown"}`);
      LogError(error, "Error in clicker command execution");

      const errorEmbed = new EmbedBuilder().setColor("Red").setTitle("An error has occurred").setDescription(`${error_emote} An error occurred while processing your click. Please try again later.`);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch((err) => logger.error(`[clicker] Failed to send follow-up error message:`, err));
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch((err) => logger.error(`[clicker] Failed to send error reply:`, err));
      }
    }
  },
};
