const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "links",
  description: "Get links related to the Java Lava bot.",
  settings: { isDeveloperOnly: false },
  permissions: {
    user: [PermissionFlagsBits.SendMessages],
    bot: [PermissionFlagsBits.SendMessages],
  },
  execute: async (message, args, client) => {
    const embed = new EmbedBuilder()
      .setTitle("Java Lava Useful Links")
      .setDescription("Here are some useful links related to Java Lava:")
      .addFields(
        { name: "Support Server", value: "[Join our Support Server](https://discord.gg/tM8Y5acUta)", inline: true },
        { name: "Invite Java Lava Standard", value: "[Invite Java Lava Standard](https://discord.com/oauth2/authorize?client_id=1390723130904805376&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbetajavalava.phillsphanbh3.me%2F&integration_type=0&scope=identify+guilds+guilds.join+bot)", inline: true },
        { name: "Invite Java Lava Standard", value: "[Invite Java Lava Standard](https://discord.com/oauth2/authorize?client_id=1305190785536360519&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fjavalava.phillsphanbh3.me%2F&integration_type=0&scope=identify+guilds+guilds.join+bot)", inline: true },
        { name: "Website", value: "[Visit our Website](https://betajavalava.phillsphanbh3.me/)", inline: true },
        { name: "Docs", value: "[Read the Documentation](https://betajavalava.phillsphanbh3.me/docs)", inline: true },
        { name: "Advanced Docs", value: "[Read the Advanced Documentation](https://javalavadocs.phillsphanbh3.me/)", inline: true },
        { name: "Terms of Service", value: "[Read our Terms of Service](https://betajavalava.phillsphanbh3.me/legal/tos)", inline: true },
        { name: "Privacy Policy", value: "[Read our Privacy Policy](https://betajavalava.phillsphanbh3.me/legal/privacy)", inline: true },
      )
      .setColor("#00AAFF")
      .setFooter({ text: "Thank you for using Java Lava!", iconURL: client.user.displayAvatarURL() });

    return message.reply({ embeds: [embed] });
  },
};
