const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const parseTime = require("./timeUtils");

const formatPermissions = (permissions, hasPermission) =>
  permissions
    .filter((perm) => !hasPermission(perm))
    .map(
      (perm) =>
        `- ${Object.keys(PermissionFlagsBits)
          .find((key) => PermissionFlagsBits[key] === perm)
          .replace(/([A-Z])/g, " $1")
          .trim()}`,
    )
    .join("\n");

module.exports = async function checkPermissions(type, target, command, client) {
  const { user = [], bot = [] } = command.permissions || {};
  const { isbetaOnly, isBetaOnly, isPremiumOnly, isServerOwnerOnly, isDeveloperOnly } = command.settings || {};
  const cooldownMs = parseTime(command.cooldown || "0s");

  const userId = (target.user ?? target.author)?.id;

  const commandName = command.data?.name ?? command.name;

  const cooldownKey = `${target.guild?.id}-${userId}-${commandName}`;

  const userPerms = formatPermissions(user, (p) => target.member?.permissions?.has(p));
  const botPerms = formatPermissions(bot, (p) => target.guild?.members?.me?.permissions?.has(p));

  const permissionMessage = [userPerms && `You are missing permissions:\n${userPerms}`, botPerms && `I (bot) am missing permissions:\n${botPerms}`, isbetaOnly && `This is a beta-only command.`, isBetaOnly && `This command is meant for testing by our beta testers.`, isPremiumOnly && `This is a premium-only command.`, isServerOwnerOnly && target.user?.id !== target.guild?.ownerId && `This command is server owner only.`, isDeveloperOnly && !client.config.developers.includes(userId) && `This command is developer only.`].filter(Boolean).join("\n");

  const ephemeral = type === "interaction" ? { flags: MessageFlags.Ephemeral } : {};

  if (permissionMessage) {
    return target.reply({ content: permissionMessage, ...ephemeral });
  }

  const now = Date.now();
  const expiry = client.cooldowns.get(cooldownKey);

  if (expiry && expiry > now) {
    return target.reply({
      content: `Cooldown: <t:${Math.floor(expiry / 1000)}:R>`,
      ...ephemeral,
    });
  }

  client.cooldowns.set(cooldownKey, now + cooldownMs);
};
