const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { supportinvite } = require("../../../../utils/support-invite");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { error_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder().setName("invite-bot").setDescription("Invite Java Lava to your server today!").setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction, client) {
    try {
      const inviteEmbed = new EmbedBuilder().setTitle("Invite Java Lava to Your Server!").setDescription(`Choose the bot you want to invite!`).addFields({ name: "Java Lava Standard", value: "[Invite Java Lava Standard](https://javalava.phillsphanbh3.me/invite/standard)", inline: true }, { name: "Java Lava Standard", value: "[Invite Java Lava Standard](https://javalava.phillsphanbh3.me/invite/beta)", inline: true }).setColor("#00AAFF").setFooter({ text: "Thank you for choosing Java Lava!", iconURL: client.user.displayAvatarURL() });
      await interaction.reply({ embeds: [inviteEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("Invite Bot Command Error:", error);
      LogError(error, interaction, "commands/slash/public/utility/invite_bot.js");
      return await interaction.reply({
        content: `${error_emote} An error occurred while trying to execute the command. Please try again later. If the issue persists, join our support server: ${supportinvite}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
