const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const Blacklistserver = require("../../../schema/blacklist_server");
const { LogError } = require("../../../utils/LogError");
const { logger } = require("../../../utils/logger");
const { error_emote, warning_emote, success_emote } = require("../../../utils/emotes");

module.exports = {
  settings: { isDeveloperOnly: true },
  data: new SlashCommandBuilder()
    .setName("dev-blacklist-server")
    .setDescription("Add a new server to the bot blacklist")
    .addStringOption((option) => option.setName("action").setDescription("guild options").setRequired(true).addChoices({ name: "Add", value: "add" }, { name: "Remove", value: "remove" }))
    .addStringOption((option) => option.setName("server").setDescription("Guild ID to add/remove from the blacklist").setRequired(true)),
  async execute(interaction, client) {
    const { options } = interaction;

    const action = options.getString("action");
    const server = options.getString("server");

    // Server ID validation (basic check)
    if (!/^\d{17,19}$/.test(server)) {
      return await interaction.reply({
        content: `❌ Invalid server ID format.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    try {
      if (action === "add") {
        const data = await Blacklistserver.findOne({ Guild: server });
        if (!data) {
          await Blacklistserver.create({ Guild: server });

          await interaction.reply({
            content: `${success_emote} **Adding to blacklist...**`,
            flags: MessageFlags.Ephemeral,
          });

          setTimeout(async () => {
            await interaction.editReply({
              content: `**Indexing servers...**`,
              flags: MessageFlags.Ephemeral,
            });

            const check = client.guilds.cache.get(server);
            if (check) {
              await check.leave();
              setTimeout(async () => {
                await interaction.editReply({
                  content: `${success_emote} Blacklist has been **completed!** I have also left the server \`${server}\` as I was already in it.`,
                  flags: MessageFlags.Ephemeral,
                });
              }, 3000); // Added delay for proper execution
            } else {
              setTimeout(async () => {
                await interaction.editReply({
                  content: `${success_emote} Blacklist **completed!** I can't join \`${server}\` anymore and will leave if added.`,
                  flags: MessageFlags.Ephemeral,
                });
              }, 3000); // Added missing delay
            }
          }, 2000);
        } else {
          return await interaction.reply({
            content: `${warning_emote} The server \`${server}\` is already **blacklisted** from the bot.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      } else if (action === "remove") {
        const data = await Blacklistserver.findOne({ Guild: server });

        if (!data) {
          return interaction.reply({
            content: `${warning_emote} The server \`${server}\` is not currently **blacklisted!**`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Remove the entry (use deleteOne if IDs are unique)
        await Blacklistserver.deleteOne({ Guild: server });

        return interaction.reply({
          content: `${success_emote} I have successfully removed \`${server}\` from the **blacklist!**`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      logger.error("Error in blacklist command:", error, LogError);
      LogError(error, interaction.client, "Dev Blacklist Server Command");
      return await interaction.reply({
        content: `${error_emote} An error occurred while processing the blacklist. Please try again later.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
