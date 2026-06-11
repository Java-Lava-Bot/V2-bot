const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, loading_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");
const { Automod_Name_Modal } = require("../../../../../components/modals/automod_name");
const { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal } = require("../../../../../utils/automod/utils");

const PRESET = Object.freeze({ PROFANITY: 1, INSULTS_AND_SLURS: 2, SEXUAL_CONTENT: 3 });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-flagged-words")
    .setDescription("Setup a flagged words AutoMod rule for this server")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption((o) => o.setName("severe_profanity").setDescription("Filter severe profanity").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addStringOption((o) => o.setName("insults_and_slurs").setDescription("Filter insults and slurs").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addStringOption((o) => o.setName("sexual_content").setDescription("Filter sexual content").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addStringOption((o) => o.setName("block_message").setDescription("Block flagged messages").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addChannelOption((o) => o.setName("log_channel").setDescription("Channel to log AutoMod actions").setRequired(true))
    .addStringOption((o) => o.setName("block_message_comment").setDescription("Custom message shown when a message is blocked").setRequired(false)),

  async execute(interaction, client) {
    const { guild, options } = interaction;
    const block_message = options.getString("block_message");
    const log_channel = options.getChannel("log_channel");
    const block_message_comment = options.getString("block_message_comment") ?? "Your message has been blocked due to containing prohibited content.";

    const presets = [options.getString("severe_profanity") === "enable" && PRESET.PROFANITY, options.getString("insults_and_slurs") === "enable" && PRESET.INSULTS_AND_SLURS, options.getString("sexual_content") === "enable" && PRESET.SEXUAL_CONTENT].filter(Boolean);

    if (!presets.length) {
      await interaction.reply({ content: `${warning_emote} You must enable at least one filter preset to create this rule.`, flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await Automod_Name_Modal.execute(interaction, client);
    } catch (error) {
      logger.error("[AutoMod:FlaggedWords] Failed to show modal:", error);
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
        content: `${loading_emote} Please wait while ${client.user.username} sets up the flagged words rule...`,
        flags: MessageFlags.Ephemeral,
      });

      const actions = [...(block_message === "enable" ? [{ type: 1, metadata: { customMessage: block_message_comment } }] : []), { type: 2, metadata: { channel: log_channel.id } }];

      const rule = await guild.autoModerationRules.create({
        name: `${automodName} - Java Lava`,
        creatorId: client.user.id,
        eventType: 1,
        triggerType: 4,
        enabled: true,
        triggerMetadata: { presets },
        actions,
      });

      const presetLabels = presets.map((p) => ({ [PRESET.PROFANITY]: "Severe Profanity", [PRESET.INSULTS_AND_SLURS]: "Insults & Slurs", [PRESET.SEXUAL_CONTENT]: "Sexual Content" })[p]);

      await submitted.editReply({
        content: "",
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ AutoMod Flagged Words Rule Created")
            .setDescription(`${success_emote} Rule \`${rule.name}\` has been created with the selected presets.`)
            .addFields({ name: "Name", value: rule.name }, { name: "Presets", value: presetLabels.join(", ") }, { name: "Log Channel", value: `<#${log_channel.id}>` })
            .setTimestamp(),
        ],
      });

      await submitted.followUp({ embeds: [buildNoticeEmbed(warning_emote)], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("[AutoMod:FlaggedWords] Error creating rule:", error);
      await LogError(error, client, "AutoMod Flagged Words");
      await safeReply(submitted, {
        embeds: [buildErrorEmbed(error_emote, `${error_emote} An error occurred while creating the rule. Ensure the bot has the required permissions. [Support](${supportinvite})`)],
      });
    }
  },
};
