const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const paperTradingRepo = require("../db/paperTrading");
const usersRepo = require("../db/users");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("portfolio")
    .setDescription("View your paper trading portfolio"),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const balance = usersRepo.getPaperBalance(discordId);
    const positions = paperTradingRepo.getAllPositions(discordId);

    if (positions.length === 0) {
      await interaction.reply("Cash balance: $" + balance.toFixed(2) + ". No open paper positions. Use /buy to start.");
      return;
    }

    await interaction.deferReply();

    let totalValue = balance;
    const lines = [];

    for (const position of positions) {
      const token = await marketData.lookupToken(position.symbol_or_query, position.chain);
      const currentPrice = token ? token.priceUsd : null;
      const value = currentPrice ? currentPrice * position.quantity : null;
      const unrealizedPnl = currentPrice ? value - position.quantity * position.avg_entry_price : null;

      if (value) {
        totalValue += value;
      }

      lines.push(
        "**" +
          position.symbol_or_query +
          "**: " +
          position.quantity.toFixed(4) +
          " units, avg entry " +
          format.formatUsd(position.avg_entry_price) +
          (currentPrice
            ? ", value " + format.formatCompactUsd(value) + ", unrealized " + (unrealizedPnl >= 0 ? "+" : "") + "$" + unrealizedPnl.toFixed(2)
            : ", current price unavailable")
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("Your paper portfolio")
      .setColor(0x5865f2)
      .addFields(
        { name: "Cash balance", value: "$" + balance.toFixed(2), inline: true },
        { name: "Total portfolio value", value: "$" + totalValue.toFixed(2), inline: true }
      )
      .setDescription(lines.join("\n"))
      .setFooter({ text: disclaimers.PAPER_TRADING_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
