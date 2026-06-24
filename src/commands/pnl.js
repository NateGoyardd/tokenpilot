const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const journalRepo = require("../db/journal");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pnl")
    .setDescription("Show your journal win/loss summary from logged trades"),

  async execute(interaction) {
    const summary = journalRepo.getPnlSummary(interaction.user.id);

    if (summary.totalClosedTrades === 0) {
      await interaction.reply("You have no closed trades logged yet. Use /logtrade with both entry and exit prices to track results.");
      return;
    }

    const winRate = ((summary.wins / summary.totalClosedTrades) * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle("Your journal PnL summary")
      .setColor(summary.totalPnl >= 0 ? 0x57f287 : 0xed4245)
      .addFields(
        { name: "Closed trades", value: String(summary.totalClosedTrades), inline: true },
        { name: "Wins", value: String(summary.wins), inline: true },
        { name: "Losses", value: String(summary.losses), inline: true },
        { name: "Win rate", value: winRate + "%", inline: true },
        { name: "Estimated total PnL", value: "$" + summary.totalPnl.toFixed(2), inline: true }
      )
      .setFooter({ text: disclaimers.JOURNAL_DISCLAIMER });

    await interaction.reply({ embeds: [embed] });
  }
};
