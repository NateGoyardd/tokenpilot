const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const paperTradingRepo = require("../db/paperTrading");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Paper trade: sell a position from your fake portfolio")
    .addStringOption((option) =>
      option.setName("query").setDescription("Symbol as used when buying").setRequired(true)
    )
    .addNumberOption((option) =>
      option.setName("percent").setDescription("Percent of position to sell, defaults to 100").setMinValue(1).setMaxValue(100)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    const percent = interaction.options.getNumber("percent") || 100;

    await interaction.deferReply();

    const position = paperTradingRepo.getPosition(interaction.user.id, query);
    if (!position) {
      await interaction.editReply("You do not have an open paper position in " + query.toUpperCase() + ".");
      return;
    }

    const token = await marketData.lookupToken(query, position.chain);
    if (!token || !token.priceUsd) {
      await interaction.editReply("Could not find current price for \"" + query + "\".");
      return;
    }

    const result = paperTradingRepo.sell(interaction.user.id, query, percent, token.priceUsd);

    if (!result.ok) {
      await interaction.editReply("Could not complete the paper sell.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Paper sell executed")
      .setColor(result.realizedPnl >= 0 ? 0x57f287 : 0xed4245)
      .addFields(
        { name: "Symbol", value: query.toUpperCase(), inline: true },
        { name: "Price", value: format.formatUsd(token.priceUsd), inline: true },
        { name: "Quantity sold", value: result.quantitySold.toFixed(6), inline: true },
        { name: "Proceeds", value: "$" + result.proceedsUsd.toFixed(2), inline: true },
        {
          name: "Realized PnL",
          value: (result.realizedPnl >= 0 ? "+" : "") + "$" + result.realizedPnl.toFixed(2),
          inline: true
        },
        { name: "New balance", value: "$" + result.newBalance.toFixed(2), inline: true }
      )
      .setFooter({ text: disclaimers.PAPER_TRADING_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
