const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { supportinvite } = require("../../../../utils/support-invite");

const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

module.exports = {
  name: "poll",
  description: 'Create a poll. Usage: poll "Question?" "Option 1" "Option 2" [...up to 10 options]',
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.ManageMessages],
    bot: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
  },
  execute: async (message, args, client) => {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply("You don't have permission to create polls.");
      }

      // Parse quoted arguments: "question" "opt1" "opt2" ...
      const raw = message.content.slice(message.content.indexOf(client.config.prefix) + client.config.prefix.length).trim();
      const parts = [];
      const regex = /"([^"]+)"/g;
      let match;
      while ((match = regex.exec(raw)) !== null) {
        parts.push(match[1]);
      }

      if (parts.length < 3) {
        return message.reply("Usage: `" + client.config.prefix + 'poll "Question?" "Option 1" "Option 2" [...up to 10 options]`\n' + "Wrap each part in double quotes. You need at least a question and 2 options.");
      }

      const question = parts[0];
      const choices = parts.slice(1, 11); // max 10 options

      const description = `${question}\n\n${choices.map((c, i) => `${numberEmojis[i]} ${c}`).join("\n")}`;

      const pollEmbed = new EmbedBuilder()
        .setTitle("📊 New Poll")
        .setDescription(description)
        .setColor("Blue")
        .setFooter({ text: `Poll created by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      const pollMessage = await message.channel.send({ embeds: [pollEmbed] });

      for (let i = 0; i < choices.length; i++) {
        if (!numberEmojis[i]) break;
        await pollMessage.react(numberEmojis[i]);
      }

      return message.reply({ content: "Poll created!", allowedMentions: { repliedUser: false } });
    } catch (error) {
      logger.error(`Error executing poll command: ${error}`);
      LogError(error, client, "prefix/poll");
      return message.reply(`There was an error while executing this command. Please join our support server for help: ${supportinvite}`);
    }
  },
};
