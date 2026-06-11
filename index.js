require("dotenv/config");
const { Client, GatewayIntentBits, Collection, Options, Events, PermissionsBitField, EmbedBuilder, MessageFlags } = require("discord.js");
const logger = require("./utils/logger");
const loadEvents = require("./handlers/eventHandler");
const loadComponents = require("./handlers/componentHandler");
const config = require("./config/config");
const checkPermissions = require("./utils/checkPermissions");
const { connectToMongo } = require("./utils/mongo");
const { LogError } = require("./utils/LogError");
const { postStats } = require("./postStats");
const userblacklist = require("./schema/blacklist_user");
const Blacklistserver = require("./schema/blacklist_server");
const { botowner } = require("./config/config");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  allowedMentions: { parse: ["users", "roles"], repliedUser: false }, //* If you need @everyone ping (not suggested) you can edit allowedMentions in .send object on TextChannel
  makeCache: Options.cacheWithLimits({ PresenceManager: 0, ReactionManager: 0, ReactionUserManager: 0 }),
});
const { error_emote, warning_emote, success_emote } = require("./utils/emotes");
const { supportinvite } = require("./utils/support-invite");
client.config = config;
client.logger = logger;
client.events = new Map();
client.commands = { slash: new Collection(), prefix: new Collection(), context: new Collection() };
client.components = { buttons: new Collection(), selectMenus: new Collection(), modals: new Collection() };
client.cooldowns = new Map();
client.helpers = { checkPermissions };
module.exports = client;

async function InteractionHandler(interaction, type) {
  // Resolve the collection where this component/command should live
  const id = interaction.customId ?? interaction.commandName;
  let collection = null;

  // Directly use client[type] if it's a Collection
  if (client[type] && typeof client[type].get === "function") {
    collection = client[type];
  } else {
    // Fallback mappings for common types
    if (type === "commands") collection = client.commands?.slash;
    else if (type === "buttons") collection = client.components?.buttons;
    else if (type === "selectMenus") collection = client.components?.selectMenus;
    else if (type === "modals") collection = client.components?.modals;
  }

  const component = collection?.get?.(id);
  if (!component) return;

  // Developer-only and blacklist pre-checks for "commands" type
  if (type === "commands") {
    try {
      if (component.settings?.isDeveloperOnly) {
        const devs = Array.isArray(config.developers) ? config.developers : [];
        if (!devs.includes(interaction.user.id)) {
          return await interaction.reply({
            content: `${warning_emote} Only **DEVELOPERS** can use this command`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      const blacklistData = await userblacklist.findOne({ User: interaction.user.id });
      if (blacklistData) {
        return await interaction.reply({
          content: `${warning_emote} You have been **BLACKLISTED** from using this bot!\nTo appeal, join ${supportinvite}.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      logger.error("Error checking dev/blacklist preconditions:", error);
    }
  }

  try {
    // Safer, robust logging that won't throw if values are missing.
    const userTag = interaction.user?.tag ?? interaction.user?.username ?? interaction.user?.id ?? "Unknown User";
    const location = interaction.guild ? interaction.guild.name : "DMs";
    const triggerId = id ?? "unknown-id";
    const triggerType = type ?? "unknown-type";
    if (client.logger && typeof client.logger.info === "function") {
      client.logger.info(`[INTERACTION] ${userTag} in ${location} triggered ${triggerType} ${triggerId}`, {
        event: "interaction",
        type: triggerType,
        id: triggerId,
        userId: interaction.user?.id,
        guildId: interaction.guild?.id,
      });
    } else {
      logger.info(`[INTERACTION] ${userTag} in ${location} triggered ${triggerType} ${triggerId}`);
    }

    // Owner-only check (hard-coded id from your snippet)
    if (component.owner) {
      if (!client.config.botowner.includes(interaction.user.id)) {
        return await interaction.reply({ content: `${warning_emote} Only bot owners can use this command!`, flags: MessageFlags.Ephemeral });
      }
    }

    if (await client.helpers.checkPermissions("interaction", interaction, component, client)) return;

    // Route autocomplete interactions correctly while keeping centralized permission checks.
    if (interaction.isAutocomplete?.() && typeof component.autocomplete === "function") {
      await component.autocomplete(interaction, client);
      return;
    }

    await component.execute(interaction, client);
  } catch (error) {
    // Log locally
    logger.error(error);

    // Try to notify user (safely). Ignore known Discord races (10062, 40060).
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      await interaction
        .editReply({
          content: `${error_emote} There was an error while executing this command!`,
          embeds: [],
          components: [],
          files: [],
        })
        .catch(() => {});
    } catch (replyErr) {
      const code = replyErr && replyErr.code;
      if (code === 10062 || code === 40060) {
        logger.debug?.("Ignored expected Discord API error while replying to interaction error", { code, replyErr });
        const APIErrorAlert = new EmbedBuilder()
          .setTitle("⚠️ Alert: Interaction Error Notification Failed")
          .setDescription(`${error_emote} An error occurred while trying to notify a user about an interaction error, but it was an expected Discord API error (code ${code}). This likely means the user deleted their message or left the channel before we could reply.\n\nOriginal Interaction: ${type} ${id}\nUser: ${interaction.user?.tag ?? interaction.user?.id}\nGuild: ${interaction.guild?.name ?? "DMs"}`)
          .setColor("Yellow")
          .setTimestamp();
        await interaction.reply({ embeds: [APIErrorAlert], flags: MessageFlags.Ephemeral });
        logger.warn(APIErrorAlert.data.description);
      } else {
        logger.error("Failed to notify user about command error:", replyErr);
      }
    }

    try {
      LogError(error, client, `${type} ${id}`);
    } catch (e) {
      logger.error("LogError failed while reporting execution error", e);
    }
  }
}

client.helpers.InteractionHandler = InteractionHandler;

(async () => {
  try {
    await Promise.all([connectToMongo(), loadEvents(client), loadComponents(client)]);
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      logger.error("DISCORD_TOKEN environment variable is not set. Aborting startup.");
      process.exit(1);
    }
    await client.login(token);
    logger.info(`[Startup] Logged in as ${client.user?.tag ?? "unknown user"}, please wait until terminal says Java Lava Standard is ready.`);

    client.on("clientReady", () => {
      logger.info(`Bot is ready as ${client.user?.tag ?? "unknown user"}, Posting initial stats to Top.gg and DBL...`);
      postStats(client);
      setInterval(
        () => {
          // logger.info("Posting stats to Top.gg and DBL...");
          postStats(client);
        },
        30 * 60 * 1000,
      ); // 30 minutes

      postStats(client);
      // logger.info("Initial stats posted to Top.gg and DBL");
    });

    try {
    } catch (_) {}
  } catch (error) {
    logger.error("An error occurred during startup/login", error);
  }
})();

process.on("unhandledRejection", (reason, promise) => {
  const code = reason && reason.code;

  if (code === 10062 || code === 40060 || code === 50035) {
    logger.debug?.("Ignored expected Discord API rejection", { code, reason });
    return;
  }

  logger.error("Unhandled Promise Rejection", {
    reason: reason instanceof Error ? reason.stack || reason.message : reason,
    promise,
  });

  try {
    LogError(reason, client, "unhandledRejection");
  } catch (e) {
    logger.warn("LogError failed while reporting unhandledRejection", e);
  }
});

process.on("uncaughtException", (error) => {
  if (error && error.code === "ENOMEM") {
    logger.error("Out of memory detected.", error);
  } else {
    logger.error("Uncaught Exception", error);
  }
  try {
    LogError(error, client, "uncaughtException");
  } catch (e) {
    logger.warn("LogError failed while reporting uncaughtException", e);
  }
});

process.on("uncaughtExceptionMonitor", (error) => {
  logger.warn("Uncaught Exception Monitor", error);
});

process.on("warning", (warning) => {
  logger.warn("Node.js Warning", warning);
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    const data = await Blacklistserver.findOne({ Guild: guild.id });
    if (data) {
      await guild.leave();
    }
  } catch (err) {
    logger.error("Error handling GuildCreate blacklist check", { error: err, guildId: guild.id });
  }
});
