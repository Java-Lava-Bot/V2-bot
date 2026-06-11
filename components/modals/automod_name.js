const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

const Automod_Name_Modal = {
  customId: "automod_name",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("automod_name")
      .setTitle("AutoMod Rule Name")
      .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("automod_name_input").setLabel("Name for this AutoMod rule").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(80)));

    await interaction.showModal(modal);
  },
};

module.exports = { Automod_Name_Modal };


//! PHILL DON'T  EDIT THIS FILE IT WILL BREAK ALL THE AUTOMOD COMMANDS