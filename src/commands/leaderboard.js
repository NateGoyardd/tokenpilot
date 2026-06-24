const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const journalRepo = require("../db/journal");
const paperTradingRepo = require("../db/paperTrading");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the community leaderboard")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Which leaderboard to show")
        .addChoices(
          { name: "Paper trading", value: "paper" },
          { name: "Journal PnL", value: "journal" }
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString("type") || "paper";

    if (type === "paper") {
      const rows = paperTradingRepo.getPaperLeaderboard(10);
      if (rows.length === 0) {
        await interaction.reply("No paper trading activity yet. Use /buy to get started.");
        return;
      }
      const lines = rows.map((row, index) => {
        const sign = row.netPnl >= 0 ? "+" : "";
        return index + 1 + ". <@" + row.discordId + "> - " + sign + "$" + row.netPnl.toFixed(2);
      });
      const embed = new EmbedBuilder()
        .setTitle("Paper trading leaderboard")
        .setColor(0x5865f2)
        .setDescription(lines.join("\n"))
        .setFooter({ text: disclaimers.PAPER_TRADING_DISCLAIMER });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const rows = journalRepo.getLeaderboard(10);
    if (rows.length === 0) {
      await interaction.reply("No journal entries with both entry and exit prices yet.");
      return;
    }
    const lines = rows.map((row, index) => {
      const sign = row.totalPnl >= 0 ? "+" : "";
      return (
        index +
        1 +
        ". <@" +
        row.discordId +
        "> - " +
        sign +
        "$" +
        row.totalPnl.toFixed(2) +
        " (" +
        row.totalClosedTrades +
        " trades)"
      );
    });
    const embed = new EmbedBuilder()
      .setTitle("Journal PnL leaderboard")
      .setColor(0x5865f2)
      .setDescription(lines.join("\n"))
      .setFooter({ text: disclaimers.JOURNAL_DISCLAIMER });
    await interaction.reply({ embeds: [embed] });
  }
};
