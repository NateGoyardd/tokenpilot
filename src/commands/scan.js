const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const dexscreener = require("../providers/dexscreener");
const rugcheck = require("../providers/rugcheck");
const evmSafetyStub = require("../providers/evmSafetyStub");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

function riskColor(level) {
  if (level === "danger" || level === "high") {
    return 0xed4245;
  }
  if (level === "warning" || level === "medium") {
    return 0xfaa61a;
  }
  return 0x57f287;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("scan")
    .setDescription("Run a safety scan on a token contract")
    .addStringOption((option) =>
      option
        .setName("contract")
        .setDescription("Token contract address")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("chain")
        .setDescription("Chain the contract is on")
        .addChoices(
          { name: "Solana", value: "solana" },
          { name: "Ethereum", value: "ethereum" },
          { name: "Base", value: "base" }
        )
    ),

  async execute(interaction) {
    const contract = interaction.options.getString("contract");
    const chainOption = interaction.options.getString("chain");

    await interaction.deferReply();

    const token = await dexscreener.findToken(contract, chainOption);

    if (!token) {
      await interaction.editReply(
        "Could not find a DEX pair for that contract address. Double check the address and chain."
      );
      return;
    }

    const chain = token.chain || chainOption;

    const embed = new EmbedBuilder()
      .setTitle("Safety scan: " + (token.baseTokenSymbol || contract))
      .setColor(0x5865f2)
      .addFields(
        { name: "Chain", value: chain || "Unknown", inline: true },
        { name: "Price", value: format.formatUsd(token.priceUsd), inline: true },
        { name: "Liquidity", value: format.formatCompactUsd(token.liquidityUsd), inline: true },
        { name: "Market cap", value: format.formatCompactUsd(token.marketCapUsd), inline: true },
        { name: "24h volume", value: format.formatCompactUsd(token.volume24hUsd), inline: true },
        {
          name: "Pair age",
          value: format.formatAge(token.pairCreatedAt),
          inline: true
        }
      );

    if (chain === "solana") {
      const report = await rugcheck.getSolanaReport(token.baseTokenAddress);

      if (report.ok) {
        embed.setColor(riskColor(report.riskLevel));
        embed.addFields(
          {
            name: "Mint authority disabled",
            value: report.mintAuthorityDisabled ? "Yes" : "No or unknown",
            inline: true
          },
          {
            name: "Freeze authority disabled",
            value: report.freezeAuthorityDisabled ? "Yes" : "No or unknown",
            inline: true
          },
          {
            name: "Top 10 holders",
            value: report.topHolderPercent ? report.topHolderPercent.toFixed(2) + "%" : "Unknown",
            inline: true
          }
        );
        if (report.lpLockedPercent !== null && report.lpLockedPercent !== undefined) {
          embed.addFields({
            name: "LP locked",
            value: report.lpLockedPercent.toFixed(2) + "%",
            inline: true
          });
        }
        if (report.risks && report.risks.length > 0) {
          const riskLines = report.risks.slice(0, 5).map((risk) => "- " + risk.name);
          embed.addFields({ name: "Flagged risks", value: riskLines.join("\n") });
        } else {
          embed.addFields({ name: "Flagged risks", value: "None flagged by RugCheck" });
        }
      } else if (report.reason === "not_found") {
        embed.addFields({
          name: "Deep safety data",
          value: "RugCheck has no report for this token yet. This often means it is very new."
        });
      } else {
        embed.addFields({
          name: "Deep safety data",
          value: "RugCheck lookup failed. Liquidity and volume above are still accurate."
        });
      }
    } else {
      const stub = evmSafetyStub.evmContractSafetyCheckRequiresApiKey(chain);
      embed.addFields({ name: "Deep safety data", value: stub.message });
    }

    embed.setFooter({ text: disclaimers.SCAN_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
