const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { logger } = require("../../../../../utils/logger");
const { LogError } = require("../../../../../utils/LogError");
const { error_emote, success_emote } = require("../../../../../utils/emotes");
const { supportinvite } = require("../../../../../utils/support-invite");

module.exports = {
  name: "nickname",
  description: "Change the nickname of a user. Usage: nickname <@user|userID> <new nickname>",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageNicknames],
    bot: [PermissionFlagsBits.ManageNicknames],
  },
  execute: async (message, args, client) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply(`${error_emote} You don't have permission to manage nicknames.`);
    }

    const target = message.mentions.members.first() || (await message.guild.members.fetch(args[0]).catch(() => null));
    if (!target) {
      return message.reply(`Usage: \`${client.config.prefix}nickname <@user|userID> <new nickname>\``);
    }

    const newNickname = args.slice(1).join(" ");
    if (!newNickname) {
      return message.reply(`${error_emote} Please provide a new nickname.\nUsage: \`${client.config.prefix}nickname <@user|userID> <new nickname>\``);
    }

    try {
      await target.setNickname(newNickname, `Nickname changed by ${message.author.tag} using Java Lava Bot`);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Nickname Changed")
        .setDescription(`${success_emote} Successfully changed nickname of **${target.user.tag}** to **${newNickname}**.`)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(`[Nickname Command] Error changing nickname for ${target.user.tag}: ${error?.message ?? error}`);
      LogError(error, client, "prefix/nickname");
      return message.reply(`${error_emote} An error occurred while trying to change the nickname. Please ensure I have the proper permissions and the target user's highest role is below mine. If the issue persists, join our support server: ${supportinvite}`);
    }
  },
};
