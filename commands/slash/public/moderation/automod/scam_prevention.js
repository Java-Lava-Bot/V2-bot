const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, loading_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");
const { Automod_Name_Modal } = require("../../../../../components/modals/automod_name");
const { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal } = require("../../../../../utils/automod/utils");
const { scamLinks = [] } = require("../../../../../utils/automod/blocked/scam_links");
const { scamWords = [] } = require("../../../../../utils/automod/blocked/scam_words");
const { regexPatterns = [] } = require("../../../../../utils/automod/blocked/regex");

// Keywords only
const allKeywords = [...new Set([...scamWords, ...scamLinks])];

const TIMEOUT_SECONDS = Object.freeze({
  1: 60,
  5: 300,
  10: 600,
  60: 3600,
  1440: 86400,
  10080: 604800,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-scam-prevention")
    .setDescription("Setup a pre-built scam prevention AutoMod rule for this server")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption((o) => o.setName("block_message").setDescription("Block detected scam messages").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addChannelOption((o) => o.setName("log_channel").setDescription("Channel to log AutoMod actions").setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addStringOption((o) => o.setName("block_message_comment").setDescription("Custom message shown when a scam message is blocked").setRequired(false))
    .addIntegerOption((o) => o.setName("timeout_duration").setDescription("Optionally timeout the user (default: no timeout)").setRequired(false).addChoices({ name: "1 minute", value: 1 }, { name: "5 minutes", value: 5 }, { name: "10 minutes", value: 10 }, { name: "1 hour", value: 60 }, { name: "1 day", value: 1440 }, { name: "1 week", value: 10080 })),

  async execute(interaction, client) {
    const { guild, options } = interaction;
    const block_message = options.getString("block_message");
    const log_channel = options.getChannel("log_channel");
    const block_message_comment = options.getString("block_message_comment") ?? "Your message has been blocked due to scam content.";
    const timeout_duration = options.getInteger("timeout_duration");

    try {
      await Automod_Name_Modal.execute(interaction, client);
    } catch (error) {
      logger.error("[AutoMod:ScamPrevention] Failed to show modal:", error);
      await interaction
        .reply({
          content: `${error_emote} Failed to open the setup modal. [Support](${supportinvite})`,
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
      return;
    }

    const submitted = await awaitAutomodModal(interaction);
    if (!submitted) return;

    try {
      const automodName = submitted.fields.getTextInputValue("automod_name_input")?.trim();

      if (!automodName) {
        await submitted.reply({
          content: `${warning_emote} You must provide a name for the AutoMod rule.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await submitted.reply({
        content: `${loading_emote} Please wait while ${client.user.username} sets up the scam prevention rule...`,
        flags: MessageFlags.Ephemeral,
      });

      const actions = [
        ...(block_message === "enable" ? [{ type: 1, metadata: { customMessage: block_message_comment } }] : []),
        { type: 2, metadata: { channel: log_channel.id } },
        ...(timeout_duration && TIMEOUT_SECONDS[timeout_duration]
          ? [
              {
                type: 3,
                metadata: {
                  durationSeconds: TIMEOUT_SECONDS[timeout_duration],
                },
              },
            ]
          : []),
      ];

      // Build triggerMetadata with both keywords and regex patterns
      const triggerMetadata = {
        keywordFilter: allKeywords,
      };

      // Add regex patterns if they exist
      if (regexPatterns.length > 0) {
        triggerMetadata.regexPatterns = regexPatterns;
      }

      const rule = await guild.autoModerationRules.create({
        name: `${automodName} - Java Lava`,
        creatorId: client.user.id,
        eventType: 1,
        triggerType: 1,
        enabled: true,
        triggerMetadata,
        actions,
      });

      await submitted.editReply({
        content: "",
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ AutoMod Scam Prevention Rule Created")
            .setDescription(`${success_emote} The scam prevention rule has been successfully created.`)
            .addFields(
              { name: "Name", value: rule.name },
              {
                name: "Keywords Monitored",
                value: `${allKeywords.length} keywords`,
              },
              {
                name: "Regex Patterns",
                value: regexPatterns.length > 0 ? `${regexPatterns.length} patterns` : "None",
              },
              {
                name: "Block Message",
                value: block_message === "enable" ? "Enabled" : "Disabled",
              },
              {
                name: "Timeout",
                value: timeout_duration ? `${timeout_duration} minute${timeout_duration === 1 ? "" : "s"}` : "None",
              },
              { name: "Log Channel", value: `<#${log_channel.id}>` },
            )
            .setTimestamp(),
        ],
      });

      await submitted.followUp({
        embeds: [buildNoticeEmbed(warning_emote)],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error("[AutoMod:ScamPrevention] Error creating rule:", error);
      await LogError(error, client, "AutoMod Scam Prevention");

      await safeReply(submitted, {
        embeds: [buildErrorEmbed(error_emote, `${error_emote} An error occurred while creating the rule. Ensure the bot has the required permissions. [Support](${supportinvite})`)],
      });
    }
  },
};