const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, loading_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");
const { Automod_Name_Modal } = require("../../../../../components/modals/automod_name");
const { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal } = require("../../../../../utils/automod/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-mention-spam")
    .setDescription("Setup a mention spam AutoMod rule for this server")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addIntegerOption((o) =>
      o
        .setName("mention_limit")
        .setDescription("Maximum mentions allowed per message (2–10)")
        .setRequired(true)
        .addChoices(...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ name: String(n), value: n }))),
    )
    .addStringOption((o) => o.setName("block_message").setDescription("Block messages that exceed the mention limit").setRequired(true).addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))
    .addChannelOption((o) => o.setName("log_channel").setDescription("Channel to log AutoMod actions").setRequired(true)),

  async execute(interaction, client) {
    const { guild, options } = interaction;
    const mention_limit = options.getInteger("mention_limit");
    const block_message = options.getString("block_message");
    const log_channel = options.getChannel("log_channel");

    try {
      await Automod_Name_Modal.execute(interaction, client);
    } catch (error) {
      logger.error("[AutoMod:MentionSpam] Failed to show modal:", error);
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
        content: `${loading_emote} Please wait while ${client.user.username} sets up the mention spam rule...`,
        flags: MessageFlags.Ephemeral,
      });

      const actions = [...(block_message === "enable" ? [{ type: 1, metadata: { customMessage: "Your message has been blocked due to excessive mentions." } }] : []), { type: 2, metadata: { channel: log_channel.id } }];

      const rule = await guild.autoModerationRules.create({
        name: `${automodName} - Java Lava`,
        creatorId: client.user.id,
        eventType: 1,
        triggerType: 5,
        enabled: true,
        triggerMetadata: { mentionTotalLimit: mention_limit },
        actions,
      });

      await submitted.editReply({
        content: "",
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ AutoMod Mention Spam Rule Created")
            .setDescription(`${success_emote} The mention spam rule has been successfully created.`)
            .addFields({ name: "Name", value: rule.name }, { name: "Mention Limit", value: String(mention_limit) }, { name: "Block Message", value: block_message === "enable" ? "Enabled" : "Disabled" }, { name: "Log Channel", value: `<#${log_channel.id}>` })
            .setTimestamp(),
        ],
      });

      await submitted.followUp({ embeds: [buildNoticeEmbed(warning_emote)], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error(error);
      logger.error("[AutoMod:MentionSpam] Error creating rule:", error);
      await LogError(error, client, "AutoMod Mention Spam");
      await safeReply(submitted, {
        embeds: [buildErrorEmbed(error_emote, `${error_emote} An error occurred while creating the rule. Ensure the bot has the required permissions. [Support](${supportinvite})`)],
      });
    }
  },
};
