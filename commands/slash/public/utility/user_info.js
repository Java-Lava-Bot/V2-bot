const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { logger } = require("../../../../utils/logger");
const { LogError } = require("../../../../utils/LogError");
const { supportinvite } = require("../../../../utils/support-invite");
const { error_emote } = require("../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user-info")
    .setDescription("Get information about a user")
    .addUserOption((option) => option.setName("target").setDescription("The user to get information about").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("target") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.tag}'s Information`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields({ name: "Username", value: targetUser.username, inline: true }, { name: "Discriminator", value: `#${targetUser.discriminator}`, inline: true }, { name: "ID", value: targetUser.id, inline: true }, { name: "Bot", value: targetUser.bot ? "Yes" : "No", inline: true }, { name: "Account Created", value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true }, { name: "Joined Server", value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : "Unknown", inline: true })
        .setColor("Blurple")
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error executing user-info command:", error);
      LogError(error, interaction, "commands/slash/public/utility/user_info.js");
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
