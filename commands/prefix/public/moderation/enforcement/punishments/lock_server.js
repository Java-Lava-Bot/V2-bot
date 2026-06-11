const { PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const { supportinvite } = require("../../../../../../utils/support-invite");
const { logger } = require("../../../../../../utils/logger");
const { LogError } = require("../../../../../../utils/LogError");
const { error_emote, warning_emote, success_emote } = require("../../../../../../utils/emotes");

module.exports = {
  name: "lock_server",
  description: "Lock the entire server. Usage: lock_server [include_threads: true|false]",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.Administrator],
    bot: [PermissionFlagsBits.ManageChannels],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(`${error_emote} You need Administrator permission to lock the server.`);
    }

    const includeThreads = args[0]?.toLowerCase() !== "false";

    const statusMsg = await message.reply(`${warning_emote} Starting server lock... This may take a moment.`);

    const targetChannelTypes = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum]);

    const everyoneRole = message.guild.roles.everyone;
    const channels = await message.guild.channels.fetch();

    let affected = 0;
    const errors = [];

    for (const [, ch] of channels) {
      if (!ch || !targetChannelTypes.has(ch.type)) continue;

      try {
        const overwriteData = {
          SendMessages: false,
          AddReactions: false,
          ...(includeThreads
            ? {
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false,
              }
            : {}),
        };

        await ch.permissionOverwrites.edit(everyoneRole, overwriteData);
        affected++;

        if (includeThreads) {
          try {
            const activeThreads = await ch.threads.fetchActive();
            for (const [, th] of activeThreads.threads) {
              try {
                await th.setLocked(true);
                affected++;
              } catch (e) {
                errors.push({ id: th.id, name: th.name, error: e?.message ?? String(e) });
              }
            }
          } catch (e) {
            errors.push({ id: ch.id, name: ch.name, error: `FetchActiveThreads: ${e?.message ?? String(e)}` });
          }
        }
      } catch (e) {
        errors.push({ id: ch.id, name: ch.name, error: e?.message ?? String(e) });
      }
    }

    const summary = `${success_emote} Server lock complete. Affected: ${affected}.` + (errors.length ? ` ${error_emote} Failed on ${errors.length} item(s).` : "");

    await statusMsg.edit(summary);

    const logEmbed = new EmbedBuilder().setTitle("Server Locked").setDescription(`${warning_emote} ${message.author} locked the server.\n\nAffected: ${affected}\nFailed: ${errors.length}`).setColor("Red").setTimestamp();

    try {
      await message.channel.send({ embeds: [logEmbed] });
    } catch (e) {
      logger.warn(`[Prefix Lock Server] Unable to send log embed: ${e?.message ?? e}`);
    }

    if (errors.length) {
      logger.error(`[Prefix Lock Server] Completed with ${errors.length} errors. First error: ${errors[0]?.error}`);
    }
  },
};
