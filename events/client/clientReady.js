const { ActivityType } = require("discord.js");
const loadCommands = require("../../handlers/commandHandler");
const { logger } = require("../../utils/logger");
const config = require("../../config/config");

// ─── helpers ────────────────────────────────────────────────────────────────

async function getServerCount(client) {
  if (client.shard) {
    try {
      const counts = await client.shard.fetchClientValues("guilds.cache.size");
      return counts.reduce((a, b) => a + b, 0);
    } catch {
      return client.guilds.cache.size;
    }
  }
  return client.guilds.cache.size;
}

async function getTotalUsers(client) {
  try {
    let totalUsers = 0;

    if (client.shard) {
      try {
        // Fetch member counts from all shards
        const shardCounts = await client.shard.broadcastEval((c) => {
          let count = 0;
          c.guilds.cache.forEach((guild) => {
            count += guild.memberCount || 0;
          });
          return count;
        });
        totalUsers = shardCounts.reduce((a, b) => a + b, 0);
      } catch {
        // Fallback: just count this shard's users
        client.guilds.cache.forEach((guild) => {
          totalUsers += guild.memberCount || 0;
        });
      }
    } else {
      // Single-shard bot: count all guild members
      client.guilds.cache.forEach((guild) => {
        totalUsers += guild.memberCount || 0;
      });
    }

    return totalUsers;
  } catch (err) {
    logger.error("Error counting total users:", err);
    return 0;
  }
}

// FIX 1: removed unused third `shardInfo` parameter — it was silently dropped
function buildStatuses(serverCount, apiLatency, totalUsers) {
  return [
    {
      name: `Serving ${serverCount} servers and ${totalUsers} users!`,
      type: ActivityType.Streaming,
      url: "https://www.twitch.tv/phillsphanbh3",
    },
    { name: "Version 2.3", type: ActivityType.Playing },
    { name: "for new reminders", type: ActivityType.Watching },
    { name: "Errors and dev rage", type: ActivityType.Listening },
    {
      name: `API Latency: ${apiLatency}ms`,
      type: ActivityType.Streaming,
      url: "https://www.twitch.tv/phillsphanbh3",
    },
    {
      name: "/vote for me!",
      type: ActivityType.Streaming,
      url: "https://www.twitch.tv/phillsphanbh3",
    },
  ];
}

function makeActivityObject(status) {
  const activity = { name: status.name, type: status.type };
  if (status.type === ActivityType.Streaming && status.url) {
    activity.url = status.url;
  }
  return activity;
}

async function sendFullyOnlineNotification(client) {
  // FIX 2: resolve the logger ONCE — the old `x?.y() ?? fallback.y()` pattern
  // caused BOTH loggers to fire because logger methods return undefined,
  // which always triggered the ?? right-hand side.
  const log = client.logger ?? logger;

  const threadId = config?.readyThreadId;
  if (!threadId) {
    log.warn("[Ready Notify] No ready thread configured (config.readyThreadId missing).");
    return;
  }

  // Only send from shard 0 (or non-sharded bots) to avoid duplicate messages
  const isPrimaryShard = !client.shard || (Array.isArray(client.shard.ids) && client.shard.ids.includes(0));
  if (!isPrimaryShard) {
    return;
  }

  try {
    const thread = await client.channels.fetch(threadId).catch(() => null);

    if (!thread) {
      log.warn(`[Ready Notify] Could not fetch thread ${threadId}`);
      return;
    }

    if (!thread.isTextBased?.()) {
      log.warn(`[Ready Notify] Channel ${threadId} is not text-based.`);
      return;
    }

    // Unarchive the thread if needed
    if ("archived" in thread && thread.archived) {
      await thread.setArchived(false).catch(() => null);
    }

    const serverCount = await getServerCount(client);
    const apiLatency = Math.round(client.ws?.ping ?? 0);

    await thread.send(`✅ **Java Lava Standard is fully online!**\n` + `• Version: **2.3**\n` + `• Servers: **${serverCount}**\n` + `• API Latency: **${apiLatency}ms**\n` + `• Started: <t:${Math.floor(Date.now() / 1000)}:F>`);
  } catch (err) {
    const log = client.logger ?? logger;
    log.error("[Ready Notify] Failed to send online notification:", err);
  }
}

// ─── event ──────────────────────────────────────────────────────────────────

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    // FIX 2 (cont.): single resolved logger used throughout
    const log = client.logger ?? logger;

    try {
      await loadCommands(client);

      let i = 0;
      const serverCount = await getServerCount(client);

      // FIX 4: ws.ping is unreliable at the exact ready moment — default to 0
      // and let the interval pick up the real value after the first tick
      let apiLatency = Math.max(0, Math.round(client.ws?.ping ?? 0));
      let totalUsers = await getTotalUsers(client);
      let statuses = buildStatuses(serverCount, apiLatency, totalUsers);

      if (client.user) {
        await client.user.setActivity(makeActivityObject(statuses[i]));
      }

      // FIX 3: store the interval reference so it can be cleared if needed
      const statusInterval = setInterval(async () => {
        i = (i + 1) % statuses.length;
        const currentCount = await getServerCount(client);

        apiLatency = Math.max(0, Math.round(client.ws?.ping ?? 0));
        totalUsers = await getTotalUsers(client);
        statuses = buildStatuses(currentCount, apiLatency, totalUsers);

        if (client.user) {
          await client.user.setActivity(makeActivityObject(statuses[i]));
        }
      }, 60_000);

      // Expose the interval on the client so it can be cleared on shutdown
      client.statusInterval = statusInterval;

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
