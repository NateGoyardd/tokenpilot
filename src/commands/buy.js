const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const paperTradingRepo = require("../db/paperTrading");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Paper trade: buy a coin using fake balance")
    .addStringOption((option) =>
      option.setName("query").setDescription("Symbol, name, or contract address").setRequired(true)
    )
    .addNumberOption((option) =>
      option.setName("amount").setDescription("Fake dollar amount to spend").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("chain")
        .setDescription("Chain, if buying a specific contract")
        .addChoices(
          { name: "Solana", value: "solana" },
          { name: "Ethereum", value: "ethereum" },
          { name: "Base", value: "base" }
        )
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    const amount = interaction.options.getNumber("amount");
    const chain = interaction.options.getString("chain");

    if (amount <= 0) {
      await interaction.reply("Amount must be greater than zero.");
      return;
    }

    await interaction.deferReply();

    const token = await marketData.lookupToken(query, chain);
    if (!token || !token.priceUsd) {
      await interaction.editReply("Could not find current price for \"" + query + "\". Try a contract address.");
      return;
    }

    const result = paperTradingRepo.buy(
      interaction.user.id,
      query,
      token.chain || chain || null,
      token.baseTokenAddress || null,
      amount,
      token.priceUsd
    );

    if (!result.ok) {
      if (result.reason === "insufficient_balance") {
        await interaction.editReply(
          "Insufficient fake balance. You have $" + result.balance.toFixed(2) + " available."
        );
        return;
      }
      await interaction.editReply("Could not complete the paper trade. The price data was invalid.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Paper buy executed")
      .setColor(0x57f287)
      .addFields(
        { name: "Symbol", value: query.toUpperCase(), inline: true },
        { name: "Price", value: format.formatUsd(result.price), inline: true },
        { name: "Spent", value: "$" + amount.toFixed(2), inline: true },
        { name: "Quantity", value: result.quantity.toFixed(6), inline: true },
        { name: "Remaining balance", value: "$" + result.newBalance.toFixed(2), inline: true }
      )
      .setFooter({ text: disclaimers.PAPER_TRADING_DISCLAIMER });

    await interaction.editReply({ embeds: [embed] });
  }
};
