const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, loading_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");
const { Automod_Name_Modal } = require("../../../../../components/modals/automod_name");
const { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal } = require("../../../../../utils/automod/utils");

const MAX_KEYWORDS = 1000;
const MAX_KEYWORD_LENGTH = 60;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-keyword")
    .setDescription("Setup a keyword AutoMod rule for this server")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption((o) => o.setName("keywords").setDescription("Keywords to block, separated by commas").setRequired(true))
    .addStringOption((o) => o.setName("block_message").setDescription("Block messages containing keywords").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addChannelOption((o) => o.setName("log_channel").setDescription("Channel to log AutoMod actions").setRequired(true)),

  async execute(interaction, client) {
    const { guild, options, user } = interaction;
    const log_channel = options.getChannel("log_channel");
    const block_message = options.getString("block_message");

    const botMember = await guild.members.fetchMe();
    const channelPerms = log_channel.permissionsFor(botMember);
    if (!channelPerms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
      await interaction.reply({
        content: `${warning_emote} I don't have permission to send messages in <#${log_channel.id}>. Please grant me **View Channel** and **Send Messages** there.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const keywordsArray = options
      .getString("keywords")
      .split(",")
      .map((k) => k.trim().replace(/[\x00-\x1F\x7F]/g, ""))
      .filter(Boolean);

    if (!keywordsArray.length) {
      await interaction.reply({ content: `${warning_emote} No valid keywords provided. Please try again.`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (keywordsArray.length > MAX_KEYWORDS) {
      await interaction.reply({ content: `${warning_emote} You cannot have more than ${MAX_KEYWORDS} keywords in a single rule.`, flags: MessageFlags.Ephemeral });
      return;
    }
    const tooLong = keywordsArray.filter((k) => k.length > MAX_KEYWORD_LENGTH);
    if (tooLong.length) {
      await interaction.reply({
        content: `${warning_emote} The following keywords exceed the ${MAX_KEYWORD_LENGTH}-character limit: ${tooLong.join(", ")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await Automod_Name_Modal.execute(interaction, client);
    } catch (error) {
      logger.error("[AutoMod:Keyword] Failed to show modal:", error);
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
        content: `${loading_emote} Please wait while ${client.user.username} sets up the keyword rule...`,
        flags: MessageFlags.Ephemeral,
      });

      const actions = [...(block_message === "enable" ? [{ type: 1, metadata: { customMessage: "Your message has been blocked due to containing a prohibited keyword." } }] : []), { type: 2, metadata: { channel: log_channel.id } }];

      const rule = await guild.autoModerationRules.create({
        name: `${automodName} - Java Lava`,
        creatorId: client.user.id,
        eventType: 1,
        triggerType: 1,
        enabled: true,
        triggerMetadata: { keywordFilter: keywordsArray },
        actions,
      });

      const keywordDisplay = keywordsArray.join(", ").slice(0, 1000);

      await submitted.editReply({
        content: "",
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ AutoMod Keyword Rule Created")
            .setDescription(`${success_emote} Successfully created AutoMod keyword rule: **${rule.name}**`)
            .addFields({ name: "Keywords", value: keywordDisplay || "None" }, { name: "Block Message", value: block_message === "enable" ? "Enabled" : "Disabled" }, { name: "Log Channel", value: `<#${log_channel.id}>` })
            .setTimestamp(),
        ],
      });

      await submitted.followUp({ embeds: [buildNoticeEmbed(warning_emote)], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("[AutoMod:Keyword] Error creating rule:", error);
      await LogError(error, client, "AutoMod Keyword");
      await safeReply(submitted, {
        embeds: [buildErrorEmbed(error_emote, `${error_emote} An error occurred while creating the rule. Ensure the bot has the required permissions. [Support](${supportinvite})`)],
      });
    }
  },
};
