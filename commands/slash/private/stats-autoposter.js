const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const axios = require("axios");
const { logger } = require("../../../utils/logger");
const { LogError } = require("../../../utils/LogError");

function getGuildCount(client) {
  return client.guilds?.cache?.size ?? 0;
}

function serviceConfig(service) {
  switch (service) {
    case "top-gg":
      return {
        label: "Top.gg",
        tokenEnv: "TOP_GG_TOKEN",
        url: (botId) => `https://top.gg/api/bots/${botId}/stats`,
        headers: (token) => ({ Authorization: token }),
        body: (guildCount) => ({ server_count: guildCount }),
      };

    case "dbl":
      return {
        label: "DiscordBotList.com (DBL)",
        tokenEnv: "DBL_TOKEN",
        url: (botId) => `https://discordbotlist.com/api/v1/bots/${botId}/stats`,
        headers: (token) => ({ Authorization: token }),
        body: (guildCount) => ({ guilds: guildCount }),
      };

    default:
      return null;
  }
}

module.exports = {
  settings: { isDeveloperOnly: true },
  data: new SlashCommandBuilder()
    .setName("autoposter-stats")
    .setDescription("Manually force post stats to a bot list")
    .addStringOption((opt) => opt.setName("service").setDescription("Which service to post stats to").setRequired(true).addChoices({ name: "Top.gg", value: "top-gg" }, { name: "DiscordBotList (DBL)", value: "dbl" })),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const service = interaction.options.getString("service", true);
    const cfg = serviceConfig(service);

    if (!cfg) {
      const embed = new EmbedBuilder().setColor("Red").setTitle("❌ Invalid service").setDescription("Unknown service option selected.");
      return interaction.editReply({ embeds: [embed] });
    }

    const tokenEnvName = cfg.tokenEnv;
    const token = process.env[tokenEnvName];

    if (!token) {
      const embed = new EmbedBuilder().setColor("Red").setTitle("❌ Missing API token").setDescription(`Set \`${tokenEnvName}\` in your environment (e.g., .env) to post to ${cfg.label}.`);

      logger.warn(`[autoposter-stats] Missing token env var: ${tokenEnvName}`);
      return interaction.editReply({ embeds: [embed] });
    }

    const botId = process.env.STATS_BOT_ID ?? client.user.id;
    const guildCount = getGuildCount(client);

    try {
      await axios.post(cfg.url(botId), cfg.body(guildCount), {
        headers: {
          "Content-Type": "application/json",
          ...cfg.headers(token),
        },
        timeout: 15_000,
      });

      logger.info(`[${cfg.label}] Posted stats for botId=${botId} (guilds=${guildCount})`);

      const embed = new EmbedBuilder().setColor("Green").setTitle(`✅ Posted to ${cfg.label}`).setDescription(`Successfully posted stats.\nBot ID: **${botId}**\nServers: **${guildCount}**`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      logger.error(`[${cfg.label}] Error posting stats. status=${status} data=${JSON.stringify(data)}`);
      LogError(error, interaction, "autoposter-stats");

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle(`❌ Error Posting to ${cfg.label}`)
        .setDescription(["An error occurred while posting stats. Please check logs for more details.", status ? `HTTP Status: **${status}**` : null, data ? `Response: \`${JSON.stringify(data).slice(0, 900)}\`` : null].filter(Boolean).join("\n"));

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
