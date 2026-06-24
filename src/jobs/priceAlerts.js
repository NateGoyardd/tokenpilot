const alertsRepo = require("../db/alerts");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");
const { EmbedBuilder } = require("discord.js");

async function checkPriceAlerts(client, logger) {
  const alerts = alertsRepo.getActiveAlerts();

  for (const alert of alerts) {
    try {
      const token = await marketData.lookupToken(alert.symbol_or_query, alert.chain);
      if (!token || !token.priceUsd) {
        continue;
      }

      const shouldTrigger =
        alert.direction === "above" ? token.priceUsd >= alert.target_price : token.priceUsd <= alert.target_price;

      if (!shouldTrigger) {
        continue;
      }

      const channel = await client.channels.fetch(alert.channel_id).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle("Price alert triggered")
          .setColor(0xfaa61a)
          .addFields(
            { name: "Token", value: alert.symbol_or_query, inline: true },
            { name: "Current price", value: format.formatUsd(token.priceUsd), inline: true },
            { name: "Target", value: alert.direction + " " + format.formatUsd(alert.target_price), inline: true }
          )
          .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

        await channel.send({ content: "<@" + alert.discord_id + ">", embeds: [embed] });
      }

      alertsRepo.deactivateAlert(alert.id);
    } catch (error) {
      logger.error("Failed to process price alert", alert.id, error);
    }
  }
}

module.exports = { checkPriceAlerts };
