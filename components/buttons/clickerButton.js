const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const ClickerData = require("../../schema/clicker");

module.exports = {
  customId: "clicker",
  cooldown: "3s",
  async execute(interaction, client) {
    //! Direct MongoDB update works for small bots but is NOT recommended for prod.
    //! Use Redis (atomic INCR) + a periodic MongoDB flush for high-traffic scenarios.
    const clickerData = await ClickerData.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { totalClicks: 1 } }, { returnDocument: "after", upsert: true });

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("clicker").setLabel("Click Me!").setStyle(ButtonStyle.Primary));

    await interaction.update({
      content: `Total clicks: ${clickerData.totalClicks}`,
      components: [row],
    });
  },
};
