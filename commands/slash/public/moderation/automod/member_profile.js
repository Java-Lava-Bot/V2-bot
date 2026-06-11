const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, loading_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");
const { Automod_Name_Modal } = require("../../../../../components/modals/automod_name");
const { buildNoticeEmbed, buildErrorEmbed, safeReply, awaitAutomodModal } = require("../../../../../utils/automod/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod-member-profile")
    .setDescription("Setup a member profile AutoMod rule for this server")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addStringOption((o) => o.setName("profile_fields").setDescription("Profile field keywords to block, separated by commas").setRequired(true))
    .addChannelOption((o) => o.setName("log_channel").setDescription("Channel to log AutoMod actions").setRequired(true)),

  async execute(interaction, client) {
    const { guild, options } = interaction;
    const log_channel = options.getChannel("log_channel");

    const profileFieldsArray = options
      .getString("profile_fields")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (!profileFieldsArray.length) {
      await interaction.reply({ content: `${warning_emote} No valid profile fields provided. Please try again.`, flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await Automod_Name_Modal.execute(interaction, client);
    } catch (error) {
      logger.error("[AutoMod:MemberProfile] Failed to show modal:", error);
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
        content: `${loading_emote} Please wait while ${client.user.username} sets up the member profile rule...`,
        flags: MessageFlags.Ephemeral,
      });

      const rule = await guild.autoModerationRules.create({
        name: `${automodName} - Java Lava`,
        creatorId: client.user.id,
        eventType: 2,
        triggerType: 6,
        enabled: true,
        triggerMetadata: { profileFieldKeywords: profileFieldsArray },
        actions: [
          { type: 4, metadata: {} },
          { type: 2, metadata: { channel: log_channel.id } },
        ],
      });

      await submitted.editReply({
        content: "",
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ AutoMod Member Profile Rule Created")
            .setDescription(`${success_emote} The member profile rule has been successfully created.`)
            .addFields({ name: "Name", value: rule.name }, { name: "Profile Fields", value: profileFieldsArray.join(", ") }, { name: "Log Channel", value: `<#${log_channel.id}>` })
            .setTimestamp(),
        ],
      });

      await submitted.followUp({ embeds: [buildNoticeEmbed(warning_emote)], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("[AutoMod:MemberProfile] Error creating rule:", error);
      await LogError(error, client, "AutoMod Member Profile");
      await safeReply(submitted, {
        embeds: [buildErrorEmbed(error_emote, `${error_emote} An error occurred. Ensure the bot has the required permissions and the server is Community-enabled. [Support](${supportinvite})`)],
      });
    }
  },
};
