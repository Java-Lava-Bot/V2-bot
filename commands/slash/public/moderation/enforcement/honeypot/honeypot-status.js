const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");
const Honeypot = require("../../../../../../schema/honeypot");

module.exports = {
  data: new SlashCommandBuilder().setName("honeypot-status").setDescription("Check the status of the honeypot system in this server.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      const honeypotData = await Honeypot.findOne({ guildId: interaction.guild.id });
      if (!honeypotData) {
        return interaction.reply({
          content: `${warning_emote} No honeypot channel is currently set up for this server. You can set one up using the \`/honeypot-setup\` command.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const honeypotChannel = interaction.guild.channels.cache.get(honeypotData.channelId);
      const logChannel = honeypotData.logChannelId ? interaction.guild.channels.cache.get(honeypotData.logChannelId) : null;

      const embed = new EmbedBuilder()
        .setTitle("🍯 Honeypot Status")
        .addFields(
          {
            name: "Honeypot Channel",
            value: honeypotChannel ? `${honeypotChannel} (${honeypotData.channelId})` : `<#${honeypotData.channelId}> *(may have been deleted)*`,
            inline: false,
          },
          {
            name: "Log Channel",
            value: honeypotData.logChannelId ? (logChannel ? `${logChannel} (${honeypotData.logChannelId})` : `<#${honeypotData.logChannelId}> *(may have been deleted — use \`/beta-honeypot-modlog-notify\` to update)*`) : "None set — use `/beta-honeypot-modlog-notify` to add one.",
            inline: false,
          },
        )
        .setColor("Blue")
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("Error executing beta-honeypot-status command:", error);
      LogError(error, client, "beta-honeypot-status"); // ✅ Fixed: was (error, interaction, ...)
      const errorEmbed = new EmbedBuilder().setTitle(`${error_emote} An error occurred`).setDescription(`Something went wrong. Please try again or visit the [support server](${supportinvite}).`).setColor("#FF0000");
      try {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      } catch (_) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  },
};
