const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");

const responses = ["It is certain.", "It is decidedly so.", "Without a doubt.", "Yes — definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."];

module.exports = {
  name: "8ball",
  description: "Ask the magic 8-ball a question. Usage: 8ball <question>",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    try {
      const question = args.join(" ");
      if (!question) {
        return message.reply("Usage: `" + client.config.prefix + "8ball <question>`");
      }

      const answer = responses[Math.floor(Math.random() * responses.length)];

      const embed = new EmbedBuilder()
        .setTitle("🎱 The Magic 8-Ball")
        .addFields({ name: "Question", value: question }, { name: "Answer", value: answer })
        .setColor("Blue")
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error executing 8ball command: ${error}`);
      LogError(error, client, "8ball");
      return message.reply("There was an error while executing this command.");
    }
  },
};
