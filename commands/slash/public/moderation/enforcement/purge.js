const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Purge messages in a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) => option.setName("amount").setDescription("The number of messages to purge (max 100)").setRequired(true).setMinValue(1).setMaxValue(100))
    .addChannelOption((option) => option.setName("channel").setDescription("The channel to purge messages from").setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const amount = interaction.options.getInteger("amount");

    // Validate channel type
    if (!channel.isTextBased()) {
      return interaction.editReply({ content: `${warning_emote} The specified channel is not a text channel.` });
    }

    // Check bot permissions
    if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.editReply({
        content: `${warning_emote} I don't have permission to manage messages in that channel. Please ensure I have the "Manage Messages" permission and try again. If the issue persists, contact support: ${supportinvite}`,
      });
    }

    // Check user permissions
    if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.editReply({ content: `${warning_emote} You don't have permission to manage messages in that channel.` });
    }

    try {
      const messages = await channel.messages.fetch({ limit: amount });

      // Filter to only messages within the 14-day Discord bulk delete limit
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const validMessages = messages.filter((msg) => msg.createdTimestamp > fourteenDaysAgo);
      const skipped = messages.size - validMessages.size;

      if (validMessages.size === 0) {
        return interaction.editReply({
          content: `${warning_emote} No messages found within the last 14 days. Discord does not allow bulk deletion of messages older than 14 days.`,
        });
      }

      const deletedMessages = await channel.bulkDelete(validMessages, true);

      if (deletedMessages.size === 0) {
        return interaction.editReply({ content: `${warning_emote} No messages could be deleted. They may have already been removed.` });
      }

      const skippedNote = skipped > 0 ? ` (${skipped} message(s) skipped — older than 14 days)` : "";
      await interaction.editReply({
        content: `${success_emote} Successfully purged ${deletedMessages.size} messages in ${channel}.${skippedNote}`,
      });

      const logEmbed = new EmbedBuilder()
        .setTitle("Messages Purged")
        .setColor("Red")
        .setDescription(`${success_emote} A total of ${deletedMessages.size} messages were purged in ${channel}.`)
        .addFields({ name: "Channel", value: `${channel}`, inline: true }, { name: "Amount Deleted", value: `${deletedMessages.size}`, inline: true }, { name: "Amount Skipped (14d)", value: `${skipped}`, inline: true }, { name: "Purged By", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false })
        .setTimestamp();

      await channel.send({ embeds: [logEmbed] });
    } catch (err) {
      if (err?.code === 10062) return; // Unknown interaction — already expired
      logger.error(`[purge] Error executing command for ${interaction.user.tag}: ${err?.message ?? err}`, err);
      LogError(err, interaction, "purge");
      await interaction
        .editReply({
          content: `${error_emote} An error occurred while trying to purge messages. Please ensure I have the necessary permissions and try again. If the issue persists, contact support: ${supportinvite}`,
        })
        .catch(() => {});
    }
  },
};
