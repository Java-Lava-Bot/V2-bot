const { PermissionFlagsBits, EmbedBuilder, version: djsVersion } = require("discord.js");

const FRIENDLY_PERMS = new Map([
  [PermissionFlagsBits.ManageMessages, "Manage Messages"],
  [PermissionFlagsBits.ModerateMembers, "Moderate Members (Timeout)"],
  [PermissionFlagsBits.KickMembers, "Kick Members"],
  [PermissionFlagsBits.BanMembers, "Ban Members"],
  [PermissionFlagsBits.ManageRoles, "Manage Roles"],
  [PermissionFlagsBits.ViewChannel, "View Channel"],
  [PermissionFlagsBits.SendMessages, "Send Messages"],
  [PermissionFlagsBits.EmbedLinks, "Embed Links"],
  [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
]);

function yesNo(v) {
  return v ? "✅" : "❌";
}

function permLabel(bit) {
  return FRIENDLY_PERMS.get(bit) ?? `Perm(${bit})`;
}

function mask(str, keep = 4) {
  if (!str) return "—";
  const s = String(str);
  if (s.length <= keep) return "*".repeat(s.length);
  return `${"*".repeat(Math.max(0, s.length - keep))}${s.slice(-keep)}`;
}

/**
 * Prefix command: diagnose
 * Expected command handler contract:
 *   module.exports = { name, aliases, execute(message, args) }
 */
module.exports = {
  name: "diagnose",
  aliases: ["diag", "health"],

  /**
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.guild) {
      return message.reply("This command can only be used in a server.");
    }

    const modeArg = (args[0] ?? "").toLowerCase();
    const isPublic = modeArg === "public";
    const isPrivate = modeArg === "private" || modeArg === "";
    const skipRoles = args.map((a) => a.toLowerCase()).includes("noroles");

    const client = message.client;
    const guild = message.guild;
    const channel = message.channel;

    const me = guild.members.me ?? (await guild.members.fetchMe());

    // Permissions you typically need for a moderation bot.
    // Remove ones you don’t use to avoid false FAILs.
    const requiredGuildPerms = [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, ...(skipRoles ? [] : [PermissionFlagsBits.ManageRoles])];

    const requiredChannelPerms = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory];

    const guildPerms = me.permissions;
    const channelPerms = channel.permissionsFor(me);

    const guildPermResults = requiredGuildPerms.map((p) => ({
      perm: p,
      ok: guildPerms.has(p),
    }));

    const channelPermResults = requiredChannelPerms.map((p) => ({
      perm: p,
      ok: channelPerms?.has(p) ?? false,
    }));

    // OPTIONAL: plug in your config system here.
    // Example:
    // const config = await getGuildConfig(guild.id);
    const config = {
      modLogChannelId: null,
      muteRoleId: null,
    };

    // Config checks
    let modLogCheck = { ok: true, note: "Not configured" };
    if (config.modLogChannelId) {
      const modLog = guild.channels.cache.get(config.modLogChannelId) ?? (await guild.channels.fetch(config.modLogChannelId).catch(() => null));

      if (!modLog) {
        modLogCheck = { ok: false, note: "Configured mod log channel not found" };
      } else {
        const canWrite = modLog.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
        modLogCheck = {
          ok: Boolean(canWrite),
          note: canWrite ? `OK: #${modLog.name}` : `No access to #${modLog.name}`,
        };
      }
    }

    let muteRoleCheck = { ok: true, note: "Not configured" };
    if (config.muteRoleId) {
      const muteRole = guild.roles.cache.get(config.muteRoleId) ?? null;
      if (!muteRole) {
        muteRoleCheck = { ok: false, note: "Configured mute role not found" };
      } else {
        const botTopRole = me.roles.highest;
        const hierarchyOk = botTopRole.comparePositionTo(muteRole) > 0;
        muteRoleCheck = {
          ok: hierarchyOk,
          note: hierarchyOk ? `OK: ${muteRole.name}` : `Bot top role must be ABOVE mute role (${muteRole.name})`,
        };
      }
    }

    const guildPermLines = guildPermResults.map((r) => `${yesNo(r.ok)} ${permLabel(r.perm)}`).join("\n");

    const channelPermLines = channelPermResults.map((r) => `${yesNo(r.ok)} ${permLabel(r.perm)}`).join("\n");

    const overallOk = guildPermResults.every((r) => r.ok) && channelPermResults.every((r) => r.ok) && modLogCheck.ok && muteRoleCheck.ok;

    const uptimeSec = Math.floor(process.uptime());
    const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

    const embed = new EmbedBuilder()
      .setTitle(`Diagnose: ${overallOk ? "PASS" : "WARN/FAIL"}`)
      .setColor(overallOk ? 0x2ecc71 : 0xe67e22)
      .addFields(
        {
          name: "Runtime",
          value: `• Uptime: ${uptimeSec}s\n` + `• Memory (RSS): ${memMb} MB\n` + `• Node: ${process.version}\n` + `• discord.js: ${djsVersion}`,
          inline: false,
        },
        {
          name: "Context",
          value: `• Guild: ${guild.name} (${guild.id})\n` + `• Channel: ${channel?.name ?? "—"} (${channel?.id ?? "—"})\n` + `• Bot user: ${client.user.tag} (${client.user.id})`,
          inline: false,
        },
        { name: "Guild permissions (bot)", value: guildPermLines || "—", inline: true },
        { name: "Channel permissions (bot)", value: channelPermLines || "—", inline: true },
        {
          name: "Config checks",
          value: `• Mod log: ${yesNo(modLogCheck.ok)} ${modLogCheck.note}\n` + `• Mute role: ${yesNo(muteRoleCheck.ok)} ${muteRoleCheck.note}`,
          inline: false,
        },
      )
      .setFooter({
        text: isPublic ? "Public output: sensitive values redacted" : "Private output (DM preferred)",
      });

    if (!isPublic) {
      embed.addFields({
        name: "Sensitive (private)",
        value: `• SOME_KEY: ${mask(process.env.SOME_KEY)}`,
        inline: false,
      });
    }

    // Delivery: DM by default, channel if public or DM fails
    if (isPublic) {
      return message.reply({ embeds: [embed] });
    }

    // private (default)
    try {
      await message.author.send({ embeds: [embed] });
      if (!message.deleted) {
        await message.reply("Sent you a diagnose report via DM.");
      }
    } catch {
      // Common when user has DMs closed
      await message.reply({
        content: "I couldn't DM you (DMs closed). Posting the report here instead.",
        embeds: [embed],
      });
    }
  },
};
