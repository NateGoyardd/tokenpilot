const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const journalRepo = require("../db/journal");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logtrade")
    .setDescription("Log a trade to your personal journal")
    .addStringOption((option) =>
      option.setName("symbol").setDescription("Token symbol or name").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("side")
        .setDescription("Long or short")
        .setRequired(true)
        .addChoices({ name: "Long", value: "long" }, { name: "Short", value: "short" })
    )
    .addNumberOption((option) => option.setName("entry").setDescription("Entry price in USD"))
    .addNumberOption((option) => option.setName("exit").setDescription("Exit price in USD, if closed"))
    .addNumberOption((option) => option.setName("size").setDescription("Position size in USD"))
    .addStringOption((option) => option.setName("notes").setDescription("Optional notes about the trade")),

  async execute(interaction) {
    const symbol = interaction.options.getString("symbol");
    const side = interaction.options.getString("side");
    const entry = interaction.options.getNumber("entry");
    const exit = interaction.options.getNumber("exit");
    const size = interaction.options.getNumber("size");
    const notes = interaction.options.getString("notes");

    const id = journalRepo.logTrade(interaction.user.id, symbol, side, entry, exit, size, notes);

    const embed = new EmbedBuilder()
      .setTitle("Trade logged")
      .setColor(0x5865f2)
      .addFields(
        { name: "Entry id", value: String(id), inline: true },
        { name: "Symbol", value: symbol.toUpperCase(), inline: true },
        { name: "Side", value: side, inline: true }
      )
      .setFooter({ text: disclaimers.JOURNAL_DISCLAIMER });

    if (entry) {
      embed.addFields({ name: "Entry price", value: String(entry), inline: true });
    }
    if (exit) {
      embed.addFields({ name: "Exit price", value: String(exit), inline: true });
    }
    if (size) {
      embed.addFields({ name: "Size", value: "$" + size, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
