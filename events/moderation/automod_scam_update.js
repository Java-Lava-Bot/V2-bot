const { Events, EmbedBuilder} = require('discord.js');
const { logger } = require("../../utils/logger");
const { LogError } = require("../../utils/LogError");
const { error_emote, warning_emote, success_emote } = require("../../utils/emotes");
const { supportinvite } = require("../../utils/support-invite");

module.exports = {
    name: Events.AutoModerationRuleUpdate,
    async execute(client, oldRule, newRule) {
        try {
            if (oldRule.name !== "Scam Links" || newRule.name !== "Scam Links") return;
            
            const logChannel = await client.channels.fetch("1133480866448359420").catch(() => null);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle("Auto Moderation Rule Updated")
                .setColor("DarkOrange")
                .setDescription(`${warning_emote} The Scam Prevention auto moderation rule has been updated. Here are the details of the updated rule:\n\n${formatRule(newRule)}`)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            logger.error(`Error in AutoModerationRuleUpdate event: ${error?.message ?? error}`, error, client);
            LogError(error, client, "events/moderation/automod_scam_update.js");
        }
    },
};

function formatRule(rule) {
    return `**Enabled:** ${rule.enabled}\n**Trigger Type:** ${getTriggerType(rule.triggerType)}\n**Actions:** ${rule.actions.map(a => getActionType(a.type)).join(", ")}`;
}

function getTriggerType(type) {
    switch (type) {
        case 1: return "Keyword";
        case 2: return "Spam";
        case 3: return "Mention Spam";
        case 4: return "Link";
        default: return "Unknown";
    }
}

function getActionType(type) {
    switch (type) {
        case 1: return "Block Message";
        case 2: return "Send Alert Message";
        case 3: return "Timeout User";
        default: return "Unknown";
    }
}