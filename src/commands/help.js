const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("List available commands"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Memecoin intel bot commands")
      .setColor(0x5865f2)
      .addFields(
        {
          name: "Market data",
          value:
            "/price - price, change, market cap, volume\n" +
            "/scan - safety scan on a contract address\n" +
            "/trending - currently trending coins\n" +
            "/newcoins - recently created pairs by chain"
        },
        {
          name: "Tracking",
          value:
            "/watchlist add, remove, show - personal coin watchlist\n" +
            "/alert set, list, remove - price target alerts\n" +
            "/trackwallet add, remove, list - wallet buy/sell tracking"
        },
        {
          name: "Paper trading",
          value: "/buy - open a simulated position with fake balance\n" + "/sell - close part or all of a simulated position\n" + "/portfolio - view your simulated holdings"
        },
        {
          name: "Community",
          value:
            "/logtrade - log a real trade to your personal journal\n" +
            "/pnl - your journal win/loss summary\n" +
            "/leaderboard - paper trading or journal leaderboard"
        },
        {
          name: "Account",
          value: "/premium status - check your tier and limits"
        }
      )
      .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

    await interaction.reply({ embeds: [embed] });
  }
};
