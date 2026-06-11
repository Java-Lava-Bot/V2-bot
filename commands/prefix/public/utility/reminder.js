const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ReminderData = require("../../../../schema/reminder");
const ms = require("ms");

module.exports = {
  name: "reminder",
  description: "Set a reminder. Usage: reminder <time> <reminder text>",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    if (args.length < 2) {
      return message.reply(`Usage: \`${client.config.prefix}reminder <time> <reminder text>\`\nExample: \`${client.config.prefix}reminder 10m Take a break\``);
    }

    const time = args[0];
    const reminder = args.slice(1).join(" ");
    const duration = ms(time);

    const sendEmbed = async (text) => {
      const embed = new EmbedBuilder().setColor("Blurple").setDescription(text);
      return message.reply({ embeds: [embed] });
    };

    if (!duration) {
      return sendEmbed(`⚠ \`${time}\` is not a valid time! Use your number followed by a unit: \`5s\`, \`1m\`, \`1d\``);
    }

    await ReminderData.create({
      User: message.author.id,
      RemTime: Date.now() + duration,
      Reminder: reminder,
    });

    return sendEmbed(`✅ I have set a reminder for \`${time}\` from now saying **${reminder}** and will notify you when it is time!`);
  },
};
