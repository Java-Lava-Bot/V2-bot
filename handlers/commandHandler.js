const { REST, Routes } = require("discord.js");
const path = require("node:path");
const loadFiles = require("../utils/fileLoader");
const commandComparing = require("../utils/commandComparing");

const SNOWFLAKE = /^\d{17,19}$/;

function toComparableJson(cmd) {
  return Object.fromEntries(Object.entries(cmd.toJSON()).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]));
}

module.exports = async function loadCommands(client) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  for (const type of ["slash", "context", "prefix"]) {
    client.commands[type]?.clear();
  }

  const localGlobal = [];
  const localDev = [];
  const prefixNames = [];

  const sources = [
    { type: "slash", folder: "slash", useData: true },
    { type: "context", folder: "context", useData: true },
    { type: "prefix", folder: "prefix", useData: false },
  ];

  await Promise.all(
    sources.map(async ({ type, folder, useData }) => {
      const files = await loadFiles(path.join(__dirname, "..", "commands", folder));

      if (!files.length) {
        client.logger.warn(`[CommandLoader] No ${type} command files found.`);
        return;
      }

      await Promise.all(
        files.map(async (file) => {
          try {
            delete require.cache[require.resolve(file)];
            const cmd = require(file);
            if (!cmd || cmd.isDisabled) return;

            const name = useData ? cmd.data?.name : cmd.name;
            if (!name) {
              client.logger.warn(`[CommandLoader] Skipping ${file} — missing name.`);
              return;
            }

            client.commands[type]?.set(name, cmd);

            if (useData) {
              (cmd.settings?.isDeveloperOnly ? localDev : localGlobal).push({ ...cmd.data.toJSON(), _file: file });
            } else {
              prefixNames.push(name);
            }
          } catch (error) {
            client.logger.error(`[CommandLoader] Failed to load ${file}: ${error.message}`);
          }
        }),
      );
    }),
  );

  const hasDuplicates = detectDuplicates(client, localGlobal, "global") | detectDuplicates(client, localDev, "developer");

  const cleanGlobal = localGlobal.map(({ _file: _, ...cmd }) => cmd);
  const cleanDev = localDev.map(({ _file: _, ...cmd }) => cmd);

  if (hasDuplicates) {
    client.logger.error("[CommandLoader] Aborting sync — resolve duplicate command names above before restarting.");
    return;
  }

  const existing = await client.application.commands.fetch({ withLocalizations: false }).then((coll) => Array.from(coll.values(), toComparableJson));

  const existingMap = new Map(existing.map((cmd) => [cmd.name.toLowerCase(), cmd]));

  const needsUpdate = cleanGlobal
    .map((cmd) => {
      const prev = existingMap.get(cmd.name.toLowerCase());
      return prev ? commandComparing(cmd, prev) : cmd;
    })
    .filter(Boolean);

  const deleted = existing.filter((cmd) => !cleanGlobal.some((c) => c.name.toLowerCase() === cmd.name.toLowerCase()));

  if (needsUpdate.length || deleted.length) {
    await rest
      .put(Routes.applicationCommands(process.env.APP_ID), {
        body: cleanGlobal,
      })
      .then(() => client.logger.info(`[CommandLoader] Synced ${cleanGlobal.length} global command${cleanGlobal.length === 1 ? "" : "s"}.`))
      .catch((err) => client.logger.error(`[CommandLoader] Failed to sync global commands: ${err.message}`));
  } else {
    client.logger.info("[CommandLoader] Global commands are up to date — skipping sync.");
  }

  const { developerGuildId } = client.config;

  if (cleanDev.length && Array.isArray(developerGuildId)) {
    await Promise.all(
      developerGuildId.map(async (guildId) => {
        if (!SNOWFLAKE.test(guildId)) {
          client.logger.warn(`[CommandLoader] Invalid developer guild ID skipped: ${guildId}`);
          return;
        }

        try {
          await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, guildId), { body: cleanDev });

          client.logger.info(`[CommandLoader] Synced ${cleanDev.length} developer command${cleanDev.length === 1 ? "" : "s"} to guild ${guildId}.`);
        } catch (err) {
          client.logger.error(`[CommandLoader] Failed to sync developer commands to ${guildId}: ${err.message}`);
        }
      }),
    );
  }

  if (prefixNames.length) {
    client.logger.info(`[CommandLoader] Loaded ${prefixNames.length} prefix command${prefixNames.length === 1 ? "" : "s"}: ${prefixNames.join(", ")}`);
  }
};

function detectDuplicates(client, commands, scope) {
  const seen = new Map();
  let found = false;

  for (const cmd of commands) {
    const key = cmd.name.toLowerCase();
    if (seen.has(key)) {
      client.logger.error(`[CommandLoader] Duplicate ${scope} command name "${cmd.name}":\n` + `  → ${seen.get(key)}\n` + `  → ${cmd._file}`);
      found = true;
    } else {
      seen.set(key, cmd._file);
    }
  }

  return found;
}
