const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../../utils/LogError");
const { logger } = require("../../../../../utils/logger");
const ReportSystemModule = require("../../../../../schema/report_system");
const Reportsystem = ReportSystemModule?.Reportsystem || ReportSystemModule?.Reportsystem || ReportSystemModule?.default || ReportSystemModule;
const { error_emote, success_emote } = require("../../../../../utils/emotes");

module.exports = {
  name: "report",
  description: "Report a user to the moderators. Usage: report <@user|userID> <reason>",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    const contextPrefix = `[prefix:report][guild=${message.guild?.id ?? "unknown"}][executor=${message.author?.id ?? "unknown"}]`;

    if (!Reportsystem || typeof Reportsystem.findOne !== "function") {
      logger.error(`${contextPrefix} Report model is undefined or invalid.`);
      return message.reply(`${error_emote} Internal configuration error: report model is not available. Ask an admin to run setup or check the database connection.`);
    }

    const targetUser = message.mentions.users.first() || (await client.users.fetch(args[0]).catch(() => null));
    if (!targetUser) {
      return message.reply(`Usage: \`${client.config.prefix}report <@user|userID> <reason>\``);
    }

    const reason = args.slice(1).join(" ").trim();
    if (!reason) {
      return message.reply(`${error_emote} Please provide a reason for the report.\nUsage: \`${client.config.prefix}report <@user|userID> <reason>\``);
    }

    const config = await Reportsystem.findOne({ GuildId: message.guild.id }).lean().exec();
    if (!config?.ChannelId) {
      logger.warn(`${contextPrefix} No report log channel configured for guild.`);
      return message.reply(`${error_emote} No report log channel is configured for this server. Ask an admin to run \`${client.config.prefix}report_setup\`.`);
    }

    let reportChannel;
    try {
      reportChannel = await client.channels.fetch(config.ChannelId);
    } catch (fetchErr) {
      logger.error(`${contextPrefix} Failed to fetch channel ${config.ChannelId}: ${fetchErr?.message ?? fetchErr}`);
      LogError(fetchErr, client, "prefix/report");
      return message.reply(`${error_emote} Failed to reach the report channel. Please verify the configured channel still exists.`);
    }

    const me = reportChannel.guild?.members?.me;
    const perms = reportChannel.permissionsFor(me);
    if (!perms?.has(["SendMessages", "EmbedLinks"])) {
      return message.reply(`${error_emote} I lack permissions to send messages/embeds in the report channel.`);
    }

    const reportEmbed = new EmbedBuilder()
      .setTitle("New User Report")
      .setColor("#FF0000")
      .addFields({ name: "Reported User", value: `${targetUser.tag} (${targetUser.id})`, inline: true }, { name: "Reported By", value: `${message.author.tag} (${message.author.id})`, inline: true }, { name: "Reason", value: reason })
      .setTimestamp();

    const content = config.RoleId ? `<@&${config.RoleId}>` : undefined;

    await reportChannel.send({ content, embeds: [reportEmbed] });

    logger.info(`${contextPrefix} Report delivered to channel=${reportChannel.id} target=${targetUser.id}`);

    return message.reply(`${success_emote} Your report has been submitted and delivered to the staff team of ${message.guild.name}.`);
  },
};
