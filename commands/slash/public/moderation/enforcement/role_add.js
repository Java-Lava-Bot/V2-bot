const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const { LogError } = require("../../../../../utils/LogError");
const { logger } = require("../../../../../utils/logger");
const { supportinvite } = require("../../../../../utils/support-invite");
const { error_emote, warning_emote, success_emote } = require("../../../../../utils/emotes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role-add")
    .setDescription("Add a role to a user in the server")
    .addUserOption((option) => option.setName("target").setDescription("The user you would like to add a role to").setRequired(true))
    .addRoleOption((option) => option.setName("role").setDescription("The role you would like to add to the user").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("The reason for adding the role to the user"))
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
      return interaction.reply({ content: `${warning_emote} I cannot assign a role higher than my own.`, flags: MessageFlags.Ephemeral });
    }

    // Check invoker role hierarchy against the target role
    if (interaction.member.roles.highest.position <= role.position) {
      return interaction.reply({ content: `${warning_emote} You cannot assign a role higher than your own.`, flags: MessageFlags.Ephemeral });
    }

    // Check if user already has the role
    if (targetMember.roles.cache.has(role.id)) {
      return interaction.reply({ content: `${warning_emote} The user already has the **${role.name}** role.`, flags: MessageFlags.Ephemeral });
    }

    try {
      await targetMember.roles.add(role, `${reason} | Role added by ${interaction.user.username}`);
    } catch (error) {
      logger.error(error, client);
      LogError(error, interaction, "role-add");
      return interaction.reply({
        content: `${error_emote} An error occurred while adding the role to the user due to a possible API error or missing "Manage Roles" permission. Please join our support server for help: ${supportinvite}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder().setColor("Green").setTitle("✅ Role Added").setDescription(`${success_emote} Successfully added the **${role.name}** role to ${targetUser.tag} | Reason: ${reason} | Added by ${interaction.user.username}`);

    return interaction.reply({ embeds: [embed] });
  },
};
