const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../../utils/LogError");
const { logger } = require("../../../../../utils/logger");
const { supportinvite } = require("../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote } = require("../../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role-remove")
    .setDescription("Remove a role from a user in the server")
    .addUserOption((option) => option.setName("target").setDescription("The user you would like to remove a role from").setRequired(true))
    .addRoleOption((option) => option.setName("role").setDescription("The role you would like to remove from the user").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("The reason for removing the role from the user"))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser("target");
    const role = interaction.options.getRole("role");
    const reason = (interaction.options.getString("reason") || "No reason given.").substring(0, 500);

    // Check invoker permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: `${warning_emote} You can't execute this command because you don't have the **MANAGE ROLES** permission!`, flags: MessageFlags.Ephemeral });
    }

    // Fetch target member
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      return interaction.reply({ content: `${warning_emote} The user mentioned is not in the server.`, flags: MessageFlags.Ephemeral });
    }

    // Check bot can manage this member
    if (!targetMember.manageable) {
      return interaction.reply({ content: `${warning_emote} I can't manage this user because their highest role is above mine.`, flags: MessageFlags.Ephemeral });
    }

    // Check bot role hierarchy against the target role
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
      return interaction.reply({ content: `${warning_emote} I cannot remove a role higher than my own.`, flags: MessageFlags.Ephemeral });
    }

    // Check invoker role hierarchy against the target role
    if (interaction.member.roles.highest.position <= role.position) {
      return interaction.reply({ content: `${warning_emote} You cannot remove a role higher than your own.`, flags: MessageFlags.Ephemeral });
    }

    // Check if user actually has the role
    if (!targetMember.roles.cache.has(role.id)) {
      return interaction.reply({ content: `${warning_emote} The user does not have the **${role.name}** role.`, flags: MessageFlags.Ephemeral });
    }

    try {
      await targetMember.roles.remove(role, `${reason} | Role removed by ${interaction.user.username}`);
    } catch (error) {
      logger.error(error, client);
      LogError(error, interaction, "role-remove");
      return interaction.reply({
        content: `${error_emote} An error occurred while removing the role from the user due to a possible API error or missing "Manage Roles" permission. Please join our support server for help: ${supportinvite}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder().setColor("Green").setTitle("✅ Role Removed").setDescription(`${success_emote} Successfully removed the **${role.name}** role from ${targetUser.tag} | Reason: ${reason} | Removed by ${interaction.user.username}`);

    return interaction.reply({ embeds: [embed] });
  },
};
