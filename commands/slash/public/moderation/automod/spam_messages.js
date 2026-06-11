const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, loading_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");
const { Automod_Name_Modal } = require("../../../../../components/modals/automod_name");
const { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal } = require("../../../../../utils/automod/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-spam-messages")
    .setDescription("Setup a spam messages AutoMod rule for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("block_message").setDescription("Block detected spam messages").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addChannelOption((o) => o.setName("log_channel").setDescription("Channel to log AutoMod actions").setRequired(true))
    .addStringOption((o) => o.setName("block_message_comment").setDescription("Custom message shown when a message is blocked").setRequired(false)),

  async execute(interaction, client) {
    const { guild, options, user } = interaction;
    const block_message = options.getString("block_message");
    const log_channel = options.getChannel("log_channel");
    const block_message_comment = options.getString("block_message_comment") ?? "Your message has been blocked due to spam content.";

    try {
      await Automod_Name_Modal.execute(interaction, client);
    } catch (error) {
      logger.error("[AutoMod:SpamMessages] Failed to show modal:", error);
      await interaction.reply({ content: `${error_emote} Failed to open the setup modal. [Support](${supportinvite})`, flags: MessageFlags.Ephemeral }).catch(() => null);
      return;
    }

    const submitted = await awaitAutomodModal(interaction);
    if (!submitted) {
      return;
    }

    try {
      const automodName = submitted.fields.getTextInputValue("automod_name_input")?.trim();
      if (!automodName) {
        await submitted.reply({ content: `${warning_emote} You must provide a name for the AutoMod rule.`, flags: MessageFlags.Ephemeral });
        return;
      }

      await submitted.reply({
        embeds: [new EmbedBuilder().setColor("#FFA500").setTitle("Configuring AutoMod Rule").setDescription(`${loading_emote} Please wait while ${client.user.username} sets up the spam messages rule...`).setTimestamp()],
        flags: MessageFlags.Ephemeral,
      });

      const actions = [...(block_message === "enable" ? [{ type: 1, metadata: { customMessage: block_message_comment } }] : []), { type: 2, metadata: { channel: log_channel.id } }];

      const rule = await guild.autoModerationRules.create({
        name: `${automodName} - Java Lava`,
        creatorId: client.user.id,
        eventType: 1,
        triggerType: 3,
        enabled: true,
        actions,
      });

      await submitted.editReply({
        embeds: [new EmbedBuilder().setColor("#00FF00").setTitle("✅ AutoMod Spam Messages Rule Created").setDescription(`${success_emote} Successfully created AutoMod spam messages rule: **${rule.name}**`).setTimestamp()],
      });

      await submitted.followUp({ embeds: [buildNoticeEmbed(warning_emote)], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("[AutoMod:SpamMessages] Error creating rule:", error);
      await LogError(error, client, "AutoMod Spam Messages");
      await safeReply(submitted, {
        embeds: [buildErrorEmbed(error_emote, `${error_emote} An error occurred while creating the AutoMod rule. Ensure the bot has the required permissions. [Support](${supportinvite})`)],
      });
    }
  },
};
