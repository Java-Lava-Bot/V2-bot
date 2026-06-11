const { MessageFlags } = require("discord.js");
const checkPermissions = require("../../utils/checkPermissions");
const { LogError } = require("../../utils/LogError");
const { logger } = require("../../utils/logger");
const { supportinvite } = require("../../utils/support-invite");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    try {
      let type = "other";

      if (interaction.isChatInputCommand?.()) type = "commands";
      else if (interaction.isAutocomplete?.()) type = "commands";
      else if (interaction.isButton?.()) type = "buttons";
      else if (interaction.isAnySelectMenu?.()) type = "selectMenus";
      else if (interaction.isStringSelectMenu?.()) type = "selectMenus";
      else if (interaction.isModalSubmit?.()) type = "modals";
      else if (interaction.isContextMenuCommand?.()) type = "commands";

      if (type === "other") return;

      if (typeof client.helpers?.InteractionHandler === "function") {
        return await client.helpers.InteractionHandler(interaction, type);
      }
    } catch (err) {
      try {
        logger.error("Interaction delegation failed:", err);
      } catch (_) {}
    }

    if (!interaction.isChatInputCommand?.() && !interaction.isAutocomplete?.()) return;

    const command = client.commands.slash.get(interaction.commandName);
    if (!command) {
      try {
        if (interaction.isAutocomplete?.() && typeof interaction.respond === "function") {
          await interaction.respond([]);
        } else if (interaction.isChatInputCommand?.()) {
          await interaction.reply({ content: "Command not found.", flags: MessageFlags.Ephemeral });
        }
      } catch (_) {}
      return;
    }

    if (await checkPermissions("interaction", interaction, command, client)) return;

    try {
      if (interaction.isAutocomplete?.()) {
        if (typeof command.autocomplete === "function") {
          await command.autocomplete(interaction, client);
        }
      } else {
        await command.execute(interaction, client);
      }
    } catch (error) {
      try {
        LogError(error, client);
      } catch (_) {}
      try {
        client.logger?.error?.(`[Interactions] Error executing slash command ${interaction.commandName}: ${error?.message ?? error}`, error);
      } catch (_) {}

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: `There was an error while executing this command! Please report this to the support server ${supportinvite}`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: `There was an error while executing this command! Please report this to the support server ${supportinvite}`,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (_) {}
    }
  },
};
