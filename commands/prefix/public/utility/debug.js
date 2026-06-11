const { EmbedBuilder, PermissionFlagsBits, version: discordJsVersion } = require("discord.js");
const process = require("process");
const { lastUpdate } = require("../../../../utils/update-info");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { error_emote } = require("../../../../utils/emotes");
const { supportinvite } = require("../../../../utils/support-invite");

module.exports = {
  name: "debug",
  description: "Check bot performance, latency, and memory usage.",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    try {
      const start = Date.now();
      const sentMessage = await message.reply("Gathering debug info...");
      const responseTime = Date.now() - start;

      const memoryUsage = process.memoryUsage();
      const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
      const heapMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle("📊 Bot Debug Info")
        .setColor("Blurple")
        .addFields({ name: "API Latency", value: `${client.ws.ping}ms`, inline: true }, { name: "Response Time", value: `${responseTime}ms`, inline: true }, { name: "Guilds Served", value: `${client.guilds.cache.size}`, inline: true }, { name: "Memory (RSS)", value: `${rssMB} MB`, inline: true }, { name: "Memory (Heap Used)", value: `${heapMB} MB`, inline: true }, { name: "Discord.js Version", value: discordJsVersion, inline: true }, { name: "Shard ID", value: `${message.guild?.shardId ?? "N/A"}`, inline: true }, { name: "Last Update", value: `${lastUpdate.date} at ${lastUpdate.time}\n${lastUpdate.description}`, inline: false })
        .setFooter({ text: "If you experience lag, report this data to the support team." })
        .setTimestamp();

      await sentMessage.edit({ content: null, embeds: [embed] });
    } catch (err) {
      logger.error(`[Prefix Debug] Error executing command for ${message.author.tag}: ${err?.message ?? err}`, err);
      LogError(err, client, "prefix/debug");
      message.reply(`${error_emote} An error occurred while running the command. Please report this to the support server ${supportinvite}`).catch(() => {});
    }
  },
};
