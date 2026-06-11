const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  async execute(client) {
    client.logger.info(`[Reports] Report Moderation Event Loaded`);
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith("report_")) return;

      const [_, action, reportId] = interaction.customId.split("_");

      // Fetch the report details from your database using reportId
      const reportDetails = await client.db.getReport(reportId);
      if (!reportDetails) {
        return interaction.reply({ content: "Report not found.", ephemeral: true });
      }

      // Check if the user has permission to moderate reports
      if (!interaction.member.permissions.has("ManageMessages")) {
        return interaction.reply({ content: "You don't have permission to moderate reports.", ephemeral: true });
      }

      // Handle the action (e.g., accept, reject, etc.)
      if (action === "accept") {
        // Mark the report as accepted in the database
        await client.db.updateReport(reportId, { status: "accepted", moderatorId: interaction.user.id });
        await interaction.reply({ content: "Report accepted.", ephemeral: true });
        // Optionally, notify the reporter and the reported user
      } else if (action === "reject") {
        // Mark the report as rejected in the database
        await client.db.updateReport(reportId, { status: "rejected", moderatorId: interaction.user.id });
        await interaction.reply({ content: "Report rejected.", ephemeral: true });
        // Optionally, notify the reporter and the reported user
      }
    });
  },
};
