const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coingecko = require("../providers/coingecko");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trending")
    .setDescription("Show coins currently trending by search and social volume"),

  async execute(interaction) {
    await interaction.deferReply();

    const coins = await coingecko.getTrendingCoins();

    if (coins.length === 0) {
      await interaction.editReply("Trending data is unavailable right now. Try again shortly.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Trending coins")
      .setColor(0x5865f2)
      .setDescription(
        coins
          .map((coin, index) => {
            const rank = index + 1;
            const price = coin.priceUsd ? format.formatUsd(coin.priceUsd) : "Unavailable";
            return rank + ". **" + coin.symbol + "** (" + coin.name + ") - " + price;
          })
          .join("\n")
      )
      .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
