const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const dexscreener = require("../providers/dexscreener");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("newcoins")
    .setDescription("Show recently created pairs for a chain")
    .addStringOption((option) =>
      option
        .setName("chain")
        .setDescription("Chain to check")
        .setRequired(true)
        .addChoices(
          { name: "Solana", value: "solana" },
          { name: "Ethereum", value: "ethereum" },
          { name: "Base", value: "base" }
        )
    )
    .addStringOption((option) =>
      option.setName("query").setDescription("Optional search keyword, defaults to a broad scan")
    ),

  async execute(interaction) {
    const chain = interaction.options.getString("chain");
    const query = interaction.options.getString("query") || chain;

    await interaction.deferReply();

    const pairs = await dexscreener.getLatestPairsForChain(chain, query);

    if (pairs.length === 0) {
      await interaction.editReply("No recent pairs found for that search. Try a different keyword.");
      return;
    }

    const top = pairs.slice(0, 8);

    const embed = new EmbedBuilder()
      .setTitle("Recently created pairs on " + chain)
      .setColor(0x5865f2)
      .setDescription(
        top
          .map((pair) => {
            return (
              "**" +
              pair.baseTokenSymbol +
              "** - age " +
              format.formatAge(pair.pairCreatedAt) +
              ", liq " +
              format.formatCompactUsd(pair.liquidityUsd) +
              ", vol24h " +
              format.formatCompactUsd(pair.volume24hUsd) +
              "\n" +
              format.truncateAddress(pair.baseTokenAddress) +
              " | " +
              pair.url
            );
          })
          .join("\n\n")
      )
      .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
