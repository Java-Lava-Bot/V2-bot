const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../../../utils/LogError");
const { logger } = require("../../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");
const { supportinvite } = require("../../../../../../utils/support-invite");
const Honeypot = require("../../../../../../schema/honeypot");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("honeypot-modlog-notify")
    .setDescription("Set or change the honeypot log channel if it wasn't set up or got deleted.")
    .addChannelOption((option) => option.setName("logchannel").setDescription("The channel to send honeypot event logs to (bans, errors, etc.)").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      const honeypotData = await Honeypot.findOne({ guildId: interaction.guild.id });

      if (!honeypotData) {
        return interaction.reply({
          content: `${warning_emote} No honeypot channel is currently set up for this server. You can set one up using the \`/honeypot-setup\` command.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // ✅ Fix 1: was `logChannelId` (undefined variable) — should be honeypotData.logChannelId
      const existingLogChannel = honeypotData.logChannelId ? interaction.guild.channels.cache.get(honeypotData.logChannelId) : null;

      // Only warn if there WAS a log channel set but it no longer exists
      if (honeypotData.logChannelId && !existingLogChannel) {
        logger.warn(`[honeypot-modlog-notify] Previously set log channel ${honeypotData.logChannelId} no longer exists in guild ${interaction.guild.id} — updating to new channel.`);
      }

      const newLogChannel = interaction.options.getChannel("logchannel");

      honeypotData.logChannelId = newLogChannel.id;
      await honeypotData.save();

      return interaction.reply({
        content: `${success_emote} Honeypot log channel has been updated to ${newLogChannel}. Honeypot events will now be logged there.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error("Error executing honeypot-modlog-notify command:", error);
      // ✅ Fix 2: was passing `interaction` as client — LogError expects (error, client, context)
      LogError(error, client, "honeypot-modlog-notify");
      // ✅ Fix 3: EmbedBuilder was missing from imports — now imported at top
      const errorEmbed = new EmbedBuilder().setTitle(`${error_emote} An error occurred`).setDescription(`Something went wrong. Please try again or visit the [support server](${supportinvite}).`).setColor("#FF0000");
      try {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      } catch (_) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  },
};
