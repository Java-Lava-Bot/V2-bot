const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js"); // ✅ Added EmbedBuilder
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");
const Honeypot = require("../../../../../../schema/honeypot");

module.exports = {
  data: new SlashCommandBuilder().setName("honeypot-delete").setDescription("Delete the honeypot channel and all its settings from this server.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      const honeypotData = await Honeypot.findOne({ guildId: interaction.guild.id });
      if (!honeypotData) {
        return interaction.reply({
          content: `${warning_emote} No honeypot channel is currently set up for this server. You can set one up using the \`/honeypot-setup\` command.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await Honeypot.deleteOne({ guildId: interaction.guild.id });

      return interaction.reply({
        content: `${success_emote} The honeypot has been deleted. Previous honeypot channel was <#${honeypotData.channelId}>. You can set up a new one anytime using \`/honeypot-setup\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error("Error executing honeypot-delete command:", error);
      LogError(error, client, "honeypot-delete"); // ✅ Fixed: was (error, interaction, ...)
      const errorEmbed = new EmbedBuilder().setTitle(`${error_emote} An error occurred`).setDescription(`Something went wrong. Please try again or visit the [support server](${supportinvite}).`).setColor("#FF0000");
      try {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      } catch (_) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  },
};
