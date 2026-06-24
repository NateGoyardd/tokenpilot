const dexscreener = require("../providers/dexscreener");
const seenPairsRepo = require("../db/seenPairs");
const feedSubscriptionsRepo = require("../db/feedSubscriptions");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");
const { EmbedBuilder } = require("discord.js");

const MIN_LIQUIDITY_USD = 1000;
const MAX_AGE_MS_TO_ANNOUNCE = 1000 * 60 * 30;

async function checkNewCoins(client, logger) {
  const subscriptions = feedSubscriptionsRepo.getActiveSubscriptions("newcoins");

  if (subscriptions.length === 0) {
    return;
  }

  const byChain = new Map();
  for (const sub of subscriptions) {
    if (!byChain.has(sub.chain)) {
      byChain.set(sub.chain, []);
    }
    byChain.get(sub.chain).push(sub);
  }

  for (const [chain, subs] of byChain) {
    try {
      const pairs = await dexscreener.getLatestPairsForChain(chain, subs[0].query || chain);

      for (const pair of pairs) {
        if (!pair.pairCreatedAt) {
          continue;
        }
        const age = Date.now() - pair.pairCreatedAt;
        if (age > MAX_AGE_MS_TO_ANNOUNCE) {
          continue;
        }
        if (!pair.liquidityUsd || pair.liquidityUsd < MIN_LIQUIDITY_USD) {
          continue;
        }
        if (seenPairsRepo.hasSeenPair(pair.pairAddress)) {
          continue;
        }

        seenPairsRepo.markPairSeen(pair.pairAddress, chain);

        const embed = new EmbedBuilder()
          .setTitle("New pair detected: " + pair.baseTokenSymbol)
          .setColor(0x57f287)
          .addFields(
            { name: "Chain", value: chain, inline: true },
            { name: "Age", value: format.formatAge(pair.pairCreatedAt), inline: true },
            { name: "Liquidity", value: format.formatCompactUsd(pair.liquidityUsd), inline: true },
            { name: "Market cap", value: format.formatCompactUsd(pair.marketCapUsd), inline: true },
            { name: "24h volume", value: format.formatCompactUsd(pair.volume24hUsd), inline: true },
            { name: "Contract", value: format.truncateAddress(pair.baseTokenAddress), inline: true }
          )
          .setURL(pair.url)
          .setFooter({ text: disclaimers.SCAN_DISCLAIMER });

        for (const sub of subs) {
          const channel = await client.channels.fetch(sub.channel_id).catch(() => null);
          if (channel) {
            await channel.send({ embeds: [embed] });
          }
        }
      }
    } catch (error) {
      logger.error("Failed to check new coins for chain", chain, error);
    }
  }

  seenPairsRepo.pruneOldSeenPairs(2);
}

module.exports = { checkNewCoins };
