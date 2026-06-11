const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const { logger } = require("../../../../../../utils/logger");
const { LogError } = require("../../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote, info_emote } = require("../../../../../../utils/emotes");
const Honeypot = require("../../../../../../schema/honeypot");
const { supportinvite } = require("../../../../../../utils/support-invite");

const PUNISHMENT_LABELS = {
  purge: "purge (messages deleted, no further action)",
  timeout: "timeout (timed out + messages purged)",
  softban: "soft ban (banned + unbanned to purge messages)",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("honeypot-setup")
    .setDescription("Set up a honeypot channel to catch raiders and bots.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) => option.setName("channel").setDescription("The channel to set as the honeypot").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((option) => option.setName("punishment-type").setDescription("The type of punishment for honeypot violations (default: softban)").setRequired(true).addChoices({ name: "Purge — delete messages only, no action taken against the user", value: "purge" }, { name: "Timeout — timeout the user and purge their messages", value: "timeout" }, { name: "Softban — ban + unban to purge messages (default)", value: "softban" }))
    .addChannelOption((option) => option.setName("logchannel").setDescription("The channel to send honeypot event logs to (bans, errors, etc.)").addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel("channel");
    const logChannel = interaction.options.getChannel("logchannel") ?? null;
    const punishmentType = interaction.options.getString("punishment-type") ?? "softban";

    try {
      const existingHoneypot = await Honeypot.findOne({ guildId: interaction.guild.id });
      if (existingHoneypot) {
        return interaction.reply({
          content: `${warning_emote} A honeypot channel is already set up for this server. Please remove it using \`/honeypot-delete\` before setting up a new one.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await Honeypot.create({
        guildId: interaction.guild.id,
        channelId: channel.id,
        logChannelId: logChannel?.id ?? null,
        punishmentType,
      });

      const logChannelMention = logChannel ? ` Honeypot events will be logged in ${logChannel}.` : " No log channel was set — use `/honeypot-modlog-notify` to add one later.";

      const embed = new EmbedBuilder().setTitle(`${success_emote} Honeypot Channel Set Up`).setDescription(`${channel} has been set as the honeypot channel.${logChannelMention}\n**Punishment type:** ${PUNISHMENT_LABELS[punishmentType]}`).setColor("Green").setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

      // Warning embed in the honeypot channel
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${warning_emote} Honeypot Channel Warning`)
            .setDescription(`This channel is a honeypot meant for catching raiders and bots. ` + `Any messages sent here will result in a **${PUNISHMENT_LABELS[punishmentType]}**.`)
            .setColor("Red")
            .setTimestamp(),
        ],
      });

      // mod-log
      const modLogChannel = interaction.guild.channels.cache.find((ch) => ch.name === "mod-log" && ch.isTextBased());
      if (modLogChannel) {
        await modLogChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${info_emote} Honeypot Created`)
              .setDescription(`**Guild:** ${interaction.guild.name} (${interaction.guild.id})\n` + `**Honeypot channel:** ${channel} (${channel.id})\n` + `**Log channel:** ${logChannel ? `${logChannel} (${logChannel.id})` : "None"}\n` + `**Punishment type:** ${PUNISHMENT_LABELS[punishmentType]}\n` + `**Set by:** ${interaction.user.tag}`)
              .setColor("Blue")
              .setTimestamp(),
          ],
        });
      }
    } catch (error) {
      logger.error(`Error setting up honeypot channel in guild ${interaction.guild.id}: ${error}`);
      LogError(error, client, "beta-honeypot-setup");
      const errorEmbed = new EmbedBuilder()
        .setTitle(`${error_emote} Error Setting Up Honeypot Channel`)
        .setDescription(`An error occurred while setting up the honeypot channel. Please join the support server for assistance.`)
        .addFields({ name: "Support Server", value: `[Click Here](${supportinvite})` })
        .setColor("Red")
        .setTimestamp();
      try {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      } catch (_) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  },
};
