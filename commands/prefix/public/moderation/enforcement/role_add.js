const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { LogError } = require("../../../../../utils/LogError");
const { logger } = require("../../../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");

module.exports = {
  name: "role_add",
  description: "Add a role to a user. Usage: role_add <@user|userID> <@role|roleID> [reason]",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageRoles],
    bot: [PermissionFlagsBits.ManageRoles],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply(`${warning_emote} You can't execute this command because you don't have the **MANAGE ROLES** permission!`);
    }

    const targetMember = message.mentions.members.first() || (await message.guild.members.fetch(args[0]).catch(() => null));
    if (!targetMember) {
      return message.reply(`Usage: \`${client.config.prefix}role_add <@user|userID> <@role|roleID> [reason]\``);
    }

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!role) {
      return message.reply(`${warning_emote} Please mention a role or provide a valid role ID.\nUsage: \`${client.config.prefix}role_add <@user|userID> <@role|roleID> [reason]\``);
    }

    if (!targetMember.manageable) {
      return message.reply(`${warning_emote} I can't add this role to the user because their highest role is above mine or yours.`);
    }

    if (targetMember.roles.cache.has(role.id)) {
      return message.reply(`${warning_emote} The user already has the role **${role.name}**.`);
    }

    const reason = args.slice(2).join(" ") || "No reason provided";

    try {
      await targetMember.roles.add(role, `${reason} | Role added by ${message.author.tag}`);
    } catch (error) {
      logger.error(error, client);
      LogError(error, client, "prefix/role_add");
      return message.reply(`${error_emote} An error occurred while adding the role. Please join our support server for help: ${supportinvite}`);
    }

    const embed = new EmbedBuilder().setColor("Green").setTitle("✅ Role Added").setDescription(`${success_emote} Successfully added the role **${role.name}** to ${targetMember.user.tag} | Reason: ${reason} | Added by ${message.author.tag}`);

    return message.reply({ embeds: [embed] });
  },
};
