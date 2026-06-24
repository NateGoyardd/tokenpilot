const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("price")
    .setDescription("Look up price, market cap, volume, and chart for a coin")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Symbol, name, or contract address")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("chain")
        .setDescription("Limit search to a specific chain")
        .addChoices(
          { name: "Solana", value: "solana" },
          { name: "Ethereum", value: "ethereum" },
          { name: "Base", value: "base" }
        )
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    const chain = interaction.options.getString("chain");

    await interaction.deferReply();

    const token = await marketData.lookupToken(query, chain);

    if (!token) {
      await interaction.editReply("No matching token found for \"" + query + "\". Try a contract address for exact matches.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle((token.symbol || token.baseTokenSymbol || query.toUpperCase()) + " price data")
      .setColor(0x5865f2)
      .addFields(
        { name: "Price", value: format.formatUsd(token.priceUsd), inline: true },
        { name: "24h change", value: format.formatPercent(token.change24h), inline: true },
        { name: "Market cap", value: format.formatCompactUsd(token.marketCapUsd), inline: true },
        { name: "24h volume", value: format.formatCompactUsd(token.volume24hUsd), inline: true }
      );

    if (token.liquidityUsd !== undefined && token.liquidityUsd !== null) {
      embed.addFields({ name: "Liquidity", value: format.formatCompactUsd(token.liquidityUsd), inline: true });
    }

    if (token.chain) {
      embed.addFields({ name: "Chain", value: token.chain, inline: true });
    }

    if (token.baseTokenAddress) {
      embed.addFields({ name: "Contract", value: format.truncateAddress(token.baseTokenAddress), inline: false });
    }

    const chartUrl = token.chartUrl || token.url;
    if (chartUrl) {
      embed.setURL(chartUrl);
    }

    embed.setFooter({ text: disclaimers.SHORT_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
