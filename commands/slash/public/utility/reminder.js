const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const ReminderData = require("../../../../schema/reminder");
const ms = require("ms");

const MAX_REMINDERS_PER_USER = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Set a reminder and Java Lava will remind you!")
    .addStringOption((option) => option.setName("reminder").setDescription("What do you want to be reminded about?").setRequired(true))
    .addStringOption((option) => option.setName("time").setDescription("Time until reminder (e.g., 10m, 2h)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel),
  cooldown: "30s",
  async execute(interaction) {
    const { options } = interaction;
    const reminder = options.getString("reminder");
    const time = options.getString("time");
    const duration = ms(time);

    async function sendMessage(message) {
      const embed = new EmbedBuilder().setColor("Blurple").setDescription(message);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (isNaN(duration)) return await sendMessage(`⚠ ${time} is not a number! use your number followed by time: 5s, 1m, 1d`);

    const activeCount = await ReminderData.countDocuments({ User: interaction.user.id });
    if (activeCount >= MAX_REMINDERS_PER_USER) {
      return await sendMessage(`⚠ You already have ${activeCount} active reminders. Please wait for some to fire before setting more (max ${MAX_REMINDERS_PER_USER}).`);
    }

    await ReminderData.create({
      User: interaction.user.id,
      RemTime: Date.now() + duration,
      Reminder: reminder,
    });

    await sendMessage(`✅ I have set a reminder for \`${time}\` from now saying **${reminder}** and will notify you when it is time!`);
  },
};
