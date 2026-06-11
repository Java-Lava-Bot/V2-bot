const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const Honeypot = require("../../schema/honeypot");
const { LogError } = require("../../utils/LogError");
const { logger } = require("../../utils/logger");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCtx(ctx = {}) {
  return Object.entries(ctx)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
}
// function logInfo(msg, ctx) {
//   logger.info(`[honeypot][info] ${msg}${ctx ? " " + formatCtx(ctx) : ""}`);
// }
function logWarn(msg, ctx) {
  logger.warn(`[honeypot][warn] ${msg}${ctx ? " " + formatCtx(ctx) : ""}`);
}
function logErrorBoth(client, title, details, err, ctx) {
  try {
    if (client?.logger?.error) client.logger.error(`${title} | ${details}`);
  } catch (_) {}
  logger.error(`[honeypot][error] ${title} | ${details}${ctx ? " " + formatCtx(ctx) : ""}`);
  if (err) logger.error(err?.stack || err);
  try {
    LogError(err, client, title);
  } catch (_) {}
}
async function sendLogEmbed(client, logChannelId, embed) {
  if (!logChannelId) {
    logger.warn("[honeypot] sendLogEmbed: no logChannelId set — skipping Discord log");
    return;
  }
  try {
    const logChannel = client.channels.cache.get(logChannelId) ?? (await client.channels.fetch(logChannelId).catch(() => null));
    if (!logChannel) {
      logger.warn(`[honeypot] sendLogEmbed: channel ${logChannelId} not found`);
      return;
    }
    if (!logChannel.isTextBased()) {
      logger.warn(`[honeypot] sendLogEmbed: channel ${logChannelId} is not text-based`);
      return;
    }
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`[honeypot] sendLogEmbed: threw an error — ${err?.stack || err}`);
  }
}

// ─── Punishment handlers ──────────────────────────────────────────────────────

async function handlePurge(message, member, hp, client, ctx) {
  // logInfo("Purge completed (message deleted, no user action)", ctx);
  await sendLogEmbed(
    client,
    hp.logChannelId,
    new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🍯 Honeypot — Purge")
      .setDescription(`<@${member.id}> sent a message in <#${message.channel.id}> — message deleted, no further action taken.`)
      .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true })
      .setTimestamp(),
  );
}

async function handleTimeout(message, member, me, hp, client, ctx) {
  if (!me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    logWarn("Missing ModerateMembers permission; cannot timeout", ctx);
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🍯 Honeypot — Missing Permission")
        .setDescription(`Could not timeout <@${member.id}> — bot is missing **Moderate Members** permission.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true })
        .setTimestamp(),
    );
    return;
  }
  if (!member.moderatable) {
    logWarn("Member not moderatable (role hierarchy)", ctx);
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🍯 Honeypot — Cannot Timeout")
        .setDescription(`Could not timeout <@${member.id}> — member is above the bot in role hierarchy.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true })
        .setTimestamp(),
    );
    return;
  }

  const TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
  const reason = `Honeypot: message in honeypot channel ${message.channel.id}`;

  const dmSent = await member
    .send(`You triggered an anti-spam honeypot in **${message.guild.name}** and have been timed out.`)
    .then(() => true)
    .catch(() => false);

  try {
    await member.timeout(TIMEOUT_MS, reason);
  } catch (err) {
    logger.error("Honeypot Timeout Failed", { ...ctx, error: err });
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🍯 Honeypot — Timeout Failed")
        .setDescription(`Attempted to timeout <@${member.id}> but it threw an error.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "Error", value: `\`${err?.message ?? err}\`` })
        .setTimestamp(),
    );
    return;
  }

  // logInfo("Timeout completed", ctx);
  await sendLogEmbed(
    client,
    hp.logChannelId,
    new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🍯 Honeypot — Timeout Successful")
      .setDescription(`<@${member.id}> sent a message in <#${message.channel.id}> and was timed out for 28 days.`)
      .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "DM Sent", value: dmSent ? "✅ Yes" : "❌ No (DMs closed)", inline: true })
      .setTimestamp(),
  );
}

async function handleSoftban(message, member, me, hp, client, ctx) {
  if (!me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
    logWarn("Missing BanMembers permission; cannot softban", ctx);
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🍯 Honeypot — Missing Permission")
        .setDescription(`Could not softban <@${member.id}> — bot is missing **Ban Members** permission.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true })
        .setTimestamp(),
    );
    return;
  }
  if (!member.bannable) {
    logWarn("Member not bannable (role hierarchy / perms)", ctx);
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🍯 Honeypot — Cannot Ban")
        .setDescription(`Could not softban <@${member.id}> — member is above the bot in role hierarchy.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true })
        .setTimestamp(),
    );
    return;
  }

  const reason = `Honeypot: message in honeypot channel ${message.channel.id}`;

  const dmSent = await member
    .send(`You triggered an anti-spam honeypot in **${message.guild.name}** and were removed.`)
    .then(() => true)
    .catch(() => false);

  try {
    await message.guild.members.ban(member.id, {
      deleteMessageSeconds: 60 * 60 * 24,
      reason,
    });
  } catch (err) {
    logger.error("Honeypot Ban Failed", { ...ctx, error: err });
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🍯 Honeypot — Ban Failed")
        .setDescription(`Attempted to softban <@${member.id}> but the ban threw an error.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "Error", value: `\`${err?.message ?? err}\`` })
        .setTimestamp(),
    );
    return;
  }

  try {
    await message.guild.bans.remove(member.id, reason);
  } catch (err) {
    logger.error("Honeypot Unban Failed", { ...ctx, error: err });
    await sendLogEmbed(
      client,
      hp.logChannelId,
      new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle("🍯 Honeypot — Unban Failed (User Still Banned!)")
        .setDescription(`<@${member.id}> was banned but the unban step failed. **They are still banned** — manually unban if needed.`)
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "Error", value: `\`${err?.message ?? err}\`` })
        .setTimestamp(),
    );
    return;
  }

  // logInfo("Softban completed", ctx);
  await sendLogEmbed(
    client,
    hp.logChannelId,
    new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🍯 Honeypot — Softban Successful")
      .setDescription(`<@${member.id}> sent a message in <#${message.channel.id}> and was softbanned.`)
      .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "DM Sent", value: dmSent ? "✅ Yes" : "❌ No (DMs closed)", inline: true }, { name: "Messages Deleted", value: "Last 24h", inline: true })
      .setTimestamp(),
  );
}

// ─── Event ────────────────────────────────────────────────────────────────────
module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message, client) {
    const ctx = {
      guildId: message?.guild?.id,
      channelId: message?.channel?.id,
      messageId: message?.id,
      userId: message?.author?.id,
    };

    try {
      if (!message.guild || message.author?.bot) return;

      let hp;
      try {
        hp = await Honeypot.findOne({
          guildId: message.guild.id,
          channelId: message.channel.id,
        }).lean();
      } catch (err) {
        logger.error("Honeypot DB Query Failed", { ...ctx, error: err });
        return;
      }

      if (!hp) return;

      // logInfo("Honeypot triggered", ctx);

      await message.delete().catch((err) => {
        logger.error("Honeypot Message Delete Failed", { ...ctx, error: err });
      });

      const punishmentType = hp.punishmentType ?? "softban";

      // Always fetch member first so the admin check applies to all punishment types
      const member = await message.guild.members.fetch(message.author.id).catch((err) => {
        logger.error("Honeypot Fetch Member Failed", { ...ctx, error: err });
        return null;
      });
      if (!member) return;

      if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        // logInfo("Triggered by administrator; ignoring", ctx);
        await sendLogEmbed(
          client,
          hp.logChannelId,
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle("🍯 Honeypot — Admin Ignored")
            .setDescription(`<@${member.id}> sent a message in <#${message.channel.id}> but has **Administrator** — no action taken.`)
            .addFields({ name: "User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "Channel", value: `<#${message.channel.id}>`, inline: true })
            .setTimestamp(),
        );
        return;
      }

      // Purge needs no bot permission checks
      if (punishmentType === "purge") {
        await handlePurge(message, member, hp, client, ctx);
        return;
      }

      // Timeout and softban both need the bot's own member object for permission checks
      const me = await message.guild.members.fetchMe().catch((err) => {
        logger.error("Honeypot Fetch Bot Member Failed", { ...ctx, error: err });
        return null;
      });
      if (!me) return;

      if (punishmentType === "timeout") {
        await handleTimeout(message, member, me, hp, client, ctx);
      } else {
        await handleSoftban(message, member, me, hp, client, ctx);
      }
    } catch (err) {
      logErrorBoth(client, "Unhandled Exception (Honeypot)", `Unexpected error.\nContext: ${JSON.stringify(ctx)}`, err, ctx);
    }
  },
};
