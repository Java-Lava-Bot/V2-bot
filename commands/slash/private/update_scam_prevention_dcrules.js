const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ScamPreventionNotify = require("../../../schema/automod_scam_prevention_notify");
const { regexPatterns = [] } = require("../../../utils/automod/blocked/regex");
const { scamLinks = [] } = require("../../../utils/automod/blocked/scam_links");
const { scamWords = [] } = require("../../../utils/automod/blocked/scam_words");
const { logger } = require("../../../utils/logger");
const { LogError } = require("../../../utils/LogError");
const { supportinvite } = require("../../../utils/support-invite");
const { success_emote, warning_emote, error_emote, loading_emote } = require("../../../utils/emotes");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  settings: { isDeveloperOnly: true },
  data: new SlashCommandBuilder()
    .setName("dev-update-scam-prevention")
    .setDescription("Dev - Force update scam-prevention AutoMod rules across all servers (15s delay).")
    .addBooleanOption((o) => o.setName("dry_run").setDescription("If true, do not update; only report what would be updated.").setRequired(false)),

  async execute(interaction, client) {
    const contextPrefix = `[Dev][dev-force-update-scam-prevention][executor=${interaction.user?.id ?? "unknown"}]`;
    const dryRun = interaction.options.getBoolean("dry_run") ?? false;

    const safeEdit = async (payload) => {
      try {
        if (interaction.replied || interaction.deferred) return await interaction.editReply(payload);
        return await interaction.reply(payload);
      } catch (e) {
        logger.error(`${contextPrefix} Failed to reply/edit: ${e?.message ?? e}`);
        try {
          LogError(e, client, "dev-force-update-scam-prevention:reply");
        } catch (_) {}
        return null;
      }
    };

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ffaa00")
          .setTitle(`${loading_emote} Starting force update...`)
          .setDescription(`Mode: **${dryRun ? "DRY RUN" : "LIVE"}**\nDelay: **15s per server**`),
      ],
      flags: MessageFlags.Ephemeral,
    });

    let configs;
    try {
      // Only guilds that have a saved rule id can be updated safely
      configs = await ScamPreventionNotify.find({
        GuildId: { $ne: null },
        ScamPreventionRuleId: { $ne: null },
      }).lean();
    } catch (dbErr) {
      logger.error(`${contextPrefix} DB query failed:`, dbErr);
      try {
        LogError(dbErr, client, "dev-force-update-scam-prevention:db");
      } catch (_) {}
      return await safeEdit({
        embeds: [new EmbedBuilder().setColor("Red").setTitle(`${error_emote} Database error`).setDescription(`Failed to fetch configs from DB.\nSupport: ${supportinvite}`)],
      });
    }

    if (!configs.length) {
      return await safeEdit({
        embeds: [
          new EmbedBuilder()
            .setColor("Orange")
            .setTitle(`${warning_emote} Nothing to update`)
            .setDescription(`No guilds have a saved scam-prevention AutoMod rule ID.\n\n` + `Make sure your \`/automod-scam-prevention\` command saves \`ScamPreventionRuleId\` into the DB when creating the rule.`),
        ],
      });
    }

    // Build “latest version” trigger metadata once
    const keywordFilter = [...scamLinks, ...scamWords]
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);

    const safeRegexPatterns = regexPatterns
      .filter((v) => typeof v === "string")
      .map((v) => v.replace(/\(\?i\)/gi, "").trim())
      .filter(Boolean);

    const triggerMetadata = {
      keywordFilter: keywordFilter.length ? keywordFilter : ["free nitro", "discord.gift/", "giveaway"],
    };
    if (safeRegexPatterns.length) triggerMetadata.regexPatterns = safeRegexPatterns;

    let attempted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      attempted++;

      const guildId = cfg.GuildId;
      const ruleId = cfg.ScamPreventionRuleId;

      const perGuildPrefix = `${contextPrefix}[guild=${guildId}][rule=${ruleId}]`;

      try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
          skipped++;
          logger.warn(`${perGuildPrefix} Guild not found (bot removed). Skipping.`);
        } else {
          const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
          if (!rule) {
            skipped++;
            logger.warn(`${perGuildPrefix} AutoMod rule not found (deleted/changed). Skipping.`);
          } else {
            if (!dryRun) {
              await rule.edit({
                triggerMetadata,
                enabled: true,
              });
            }
            updated++;
            logger.info(`${perGuildPrefix} ${dryRun ? "[DRY RUN] would update" : "updated"} OK.`);
          }
        }
      } catch (err) {
        failed++;
        logger.error(`${perGuildPrefix} Update failed:`, err);
        try {
          LogError(err, client, "dev-force-update-scam-prevention:per-guild");
        } catch (_) {}
      }

      // progress update + delay (not after last one)
      if (i < configs.length - 1) {
        await safeEdit({
          embeds: [
            new EmbedBuilder()
              .setColor("#ffaa00")
              .setTitle(`${loading_emote} Force update in progress...`)
              .setDescription(`Progress: **${i + 1}/${configs.length}**\n` + `Updated: **${updated}** | Skipped: **${skipped}** | Failed: **${failed}**\n\n` + `Next server in **15 seconds**...`),
          ],
        });
        await sleep(15_000);
      }
    }

    return await safeEdit({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff66")
          .setTitle(`${success_emote} Force update complete`)
          .setDescription(`Mode: **${dryRun ? "DRY RUN" : "LIVE"}**\n\n` + `Attempted: **${attempted}**\n` + `Updated: **${updated}**\n` + `Skipped: **${skipped}**\n` + `Failed: **${failed}**`),
      ],
    });
  },
};
