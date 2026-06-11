const { Events, EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../utils/LogError");
const { logger } = require("../../../utils/logger");
const { guildevents } = require("../../../config/config");

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    try {
      if (!guild) {
        logger.warn("GuildCreate event fired but guild is undefined");
        return;
      }

      const client = guild.client;
      const channelId = guildevents && Array.isArray(guildevents) && guildevents.length > 0 ? guildevents[0] : null;

      let channel;
      try {
        channel = await client.channels.fetch(channelId);
      } catch (err) {
        channel = null;
      }

      if (!channel) {
        logger.warn("Channel not found for GuildJoin.js");
      }

      const embed = new EmbedBuilder()
        .setTitle("New Guild!")
        .setDescription(`Joined guild ${guild.name ?? guild.id} with ${guild.memberCount ?? "unknown"} members!`)
        .setColor("#00FF00")
        .setTimestamp();

      logger.info(`Joined guild ${guild.name ?? guild.id} with ${guild.memberCount ?? "unknown"} members!`);

      if (channel && channel.send) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      LogError(error, guild?.client);
      logger.error(error);
    }
  },
};
