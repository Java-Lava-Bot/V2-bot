const { ActivityType } = require("discord.js");
const loadCommands = require("../../handlers/commandHandler");
const { logger } = require("../../utils/logger");

// ✅ config path per your setup
const config = require("../../config/config");

async function getServerCount(client) {
  if (client.shard) {
    try {
      const counts = await client.shard.fetchClientValues("guilds.cache.size");
      return counts.reduce((a, b) => a + b, 0);
    } catch (err) {
      return client.guilds.cache.size;
    }
  }
  return client.guilds.cache.size;
}

function buildStatuses(serverCount, apiLatency) {
  return [
    { name: "", type: ActivityType.Playing },
    { name: "", type: ActivityType.Watching },
    { name: "", type: ActivityType.Listening },
    { name: ``, type: ActivityType.Streaming, url: "" },
  ];
}

function makeActivityObject(status) {
  const activity = { name: status.name, type: status.type };
  if (status.type === ActivityType.Streaming && status.url) activity.url = status.url;
  return activity;
}

// ✅ Sends once on every restart (clientReady fires once per process)
async function sendFullyOnlineNotification(client) {
  const threadId = config?.readyThreadId;

  if (!threadId) {
    (client.logger?.warn ?? logger.warn).call(client.logger ?? logger, "[Ready Notify] No ready thread configured (config.readyThreadId missing).");
    return;
  }

  // Avoid duplicates if you use sharding
  const isPrimaryShard = !client.shard || (Array.isArray(client.shard.ids) && client.shard.ids.includes(0));
  if (!isPrimaryShard) return;

  try {
    const thread = await client.channels.fetch(threadId).catch(() => null);

    if (!thread) {
      (client.logger?.warn ?? logger.warn).call(client.logger ?? logger, `[Ready Notify] Could not fetch thread ${threadId}`);
      return;
    }

    if (!thread.isTextBased || !thread.isTextBased()) {
      (client.logger?.warn ?? logger.warn).call(client.logger ?? logger, `[Ready Notify] Channel ${threadId} is not text-based (not a thread/text channel).`);
      return;
    }

    // Optional: unarchive the thread so the message can be sent
    // (Only works if it's a ThreadChannel and the bot has permission)
    if ("archived" in thread && thread.archived) {
      await thread.setArchived(false).catch(() => null);
    }

    const serverCount = await getServerCount(client);
    const apiLatency = Math.round(client.ws?.ping ?? 0);

    await thread.send(`✅ **Java Lava Standard is fully online!**\n` + `• Version: **2.3**\n` + `• Servers: **${serverCount}**\n` + `• API Latency: **${apiLatency}ms**\n` + `• Started: <t:${Math.floor(Date.now() / 1000)}:F>`);
  } catch (err) {
    client.logger?.error?.("[Ready Notify] Failed to send online notification:", err) ?? logger.error("[Ready Notify] Failed to send online notification:", err);
  }
}

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    try {
      await loadCommands(client);

      let i = 0;
      const serverCount = await getServerCount(client);

      let apiLatency = Math.round(client.ws?.ping ?? 0);
      let statuses = buildStatuses(serverCount, apiLatency, client.shard ? { id: client.shard.ids[0], count: client.shard.count } : null);

      if (client.user) {
        await client.user.setActivity(makeActivityObject(statuses[i]));
      }

      setInterval(async () => {
        i = (i + 1) % statuses.length;
        const currentCount = await getServerCount(client);

        apiLatency = Math.round(client.ws?.ping ?? 0);
        statuses = buildStatuses(currentCount, apiLatency, client.shard ? { id: client.shard.ids[0], count: client.shard.count } : null);

        if (client.user) {
          await client.user.setActivity(makeActivityObject(statuses[i]));
        }
      }, 60000); // Update every 60 seconds

      const shouldLogReady = !client.shard || (Array.isArray(client.shard.ids) && client.shard.ids.includes(0));
      if (shouldLogReady) {
        client.logger?.info("[Java Lava Standard - Online] Java Lava Standard is now ready!") ?? logger.info("[Java Lava Standard - Online] Java Lava Standard is now ready!");
        client.logger?.info("[Java Lava Standard - Online] Hello World! This is Java Lava Standard version 2.3, developed by Phillsphanbh3.") ?? logger.info("[Java Lava Standard - Online] Hello World! This is Java Lava Standard version 2.3, developed by Phillsphanbh3.");
      }

      // ✅ send the notification once per restart
      await sendFullyOnlineNotification(client);
    } catch (err) {
      client.logger?.error?.("Error in clientReady event:", err) ?? logger.error("Error in clientReady event:", err);
    }
  },
};
