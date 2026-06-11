const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder().setName("server-info").setDescription("Get information about the current server").setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction) {
    try {
      const { guild } = interaction;
      const owner = await guild.fetchOwner();
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Server Information`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields({ name: "Server Name", value: guild.name, inline: true }, { name: "Server ID", value: guild.id, inline: true }, { name: "Owner", value: `${owner.user.tag} (${owner.id})`, inline: true }, { name: "Member Count", value: `${guild.memberCount}`, inline: true }, { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true })
        .setColor("Blurple")
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing server-info command:", error);
      LogError(error, interaction, "commands/slash/public/utility/server_info.js");
      const errorEmbed = new EmbedBuilder()
        .setTitle(`${error_emote} An error occurred`)
        .setDescription(`Sorry, something went wrong while executing the command. Please try again later or contact support if the issue persists.\n` + `support server: ${supportinvite}`)
        .setColor("#FF0000");
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  },
};
