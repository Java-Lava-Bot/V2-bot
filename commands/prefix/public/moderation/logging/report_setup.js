const { PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const { LogError } = require("../../../../../utils/LogError");
const { logger } = require("../../../../../utils/logger");
const ReportSystemModule = require("../../../../../schema/report_system");
const Reportsystem = ReportSystemModule?.Reportsystem || ReportSystemModule?.Reportsystem || ReportSystemModule?.default || ReportSystemModule;
const { error_emote, warning_emote, success_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");

module.exports = {
  name: "report_setup",
  description: "Setup the report system. Usage: report_setup <#channel> [@role]",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    const contextPrefix = `[prefix:report_setup][guild=${message.guild?.id ?? "unknown"}][executor=${message.author?.id ?? "unknown"}]`;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply(`${warning_emote} You need the **Manage Server** permission to run this command.`);
    }

    if (!Reportsystem || typeof Reportsystem.findOneAndUpdate !== "function") {
      logger.error(`${contextPrefix} Report model is undefined or invalid.`);
      LogError(new Error("Report model is undefined or invalid"), client, "prefix/report_setup");
      return message.reply(`${error_emote} Internal configuration error: report model is not available. Please contact support. ${supportinvite}`);
    }

    const logChannel = message.mentions.channels.first();
    if (!logChannel) {
      return message.reply(`Usage: \`${client.config.prefix}report_setup <#channel> [@role]\`\nExample: \`${client.config.prefix}report_setup #reports @Moderator\``);
    }

    if (logChannel.guildId !== message.guild.id || !logChannel.isTextBased()) {
      return message.reply(`${error_emote} Please mention a text channel in this server for logging reports.`);
    }

    const me = message.guild.members.me;
    const perms = logChannel.permissionsFor(me);
    if (!perms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return message.reply(`${error_emote} I don't have permission to send messages and embeds in <#${logChannel.id}>. Please adjust channel permissions and try again.`);
    }

    const mentionRole = message.mentions.roles.first() || null;

    const reportSetup = await Reportsystem.findOneAndUpdate(
      { GuildId: message.guild.id },
      {
        GuildId: message.guild.id,
        ChannelId: logChannel.id,
        RoleId: mentionRole ? mentionRole.id : null,
      },
      { upsert: true, new: true },
    );

    const setupEmbed = new EmbedBuilder()
      .setTitle("Report System Setup")
      .setDescription(`${success_emote} The report system has been successfully set up for this server.`)
      .setColor("#00FF00")
      .addFields({ name: "Log Channel", value: `<#${logChannel.id}>`, inline: true }, { name: "Mention Role", value: mentionRole ? `<@&${mentionRole.id}>` : "None", inline: true }, { name: "Setup By", value: `${message.author.tag} (${message.author.id})`, inline: false }, { name: "Record ID", value: `${reportSetup?._id ?? "unknown"}`, inline: true }, { name: "Guild ID", value: `${message.guild.id}`, inline: true })
      .setTimestamp();

    await logChannel.send({ embeds: [setupEmbed] });

    logger.info(`${contextPrefix} Report system configured. channel=${logChannel.id} role=${mentionRole?.id ?? "none"}`);

    return message.reply(`${success_emote} Report system configured. Details posted in <#${logChannel.id}>.`);
  },
};
