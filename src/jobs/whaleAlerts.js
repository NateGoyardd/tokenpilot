const dexscreener = require("../providers/dexscreener");
const feedSubscriptionsRepo = require("../db/feedSubscriptions");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");
const config = require("../config");
const { EmbedBuilder } = require("discord.js");

const lastSeenVolumeByPair = new Map();

async function checkWhaleActivity(client, logger) {
  const subscriptions = feedSubscriptionsRepo.getActiveSubscriptions("whale");

  if (subscriptions.length === 0) {
    return;
  }

  for (const sub of subscriptions) {
    try {
      const token = await dexscreener.findToken(sub.query, sub.chain);
      if (!token || !token.volume24hUsd) {
        continue;
      }

      const key = sub.chain + ":" + (token.pairAddress || sub.query);
      const previousVolume = lastSeenVolumeByPair.get(key);
      lastSeenVolumeByPair.set(key, token.volume24hUsd);

      if (previousVolume === undefined) {
        continue;
      }

      const volumeDelta = token.volume24hUsd - previousVolume;

      if (volumeDelta < config.whaleUsdThreshold) {
        continue;
      }

      const channel = await client.channels.fetch(sub.channel_id).catch(() => null);
      if (!channel) {
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle("Large volume movement: " + (token.baseTokenSymbol || sub.query))
        .setColor(0xfaa61a)
        .addFields(
          { name: "Approx volume since last check", value: format.formatCompactUsd(volumeDelta), inline: true },
          { name: "Market cap", value: format.formatCompactUsd(token.marketCapUsd), inline: true },
          { name: "Liquidity", value: format.formatCompactUsd(token.liquidityUsd), inline: true }
        )
        .setURL(token.url)
        .setFooter({
          text:
            "This is an aggregate volume heuristic, not a confirmed single wallet trade. " +
            disclaimers.SHORT_DISCLAIMER
        });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("Failed to check whale activity for subscription", sub.id, error);
    }
  }
}

module.exports = { checkWhaleActivity };
