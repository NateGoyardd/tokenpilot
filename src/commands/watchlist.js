const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const watchlistRepo = require("../db/watchlist");
const usersRepo = require("../db/users");
const config = require("../config");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("watchlist")
    .setDescription("Manage your personal coin watchlist")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a coin to your watchlist")
        .addStringOption((option) =>
          option.setName("query").setDescription("Symbol, name, or contract address").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("chain")
            .setDescription("Chain, if tracking a specific contract")
            .addChoices(
              { name: "Solana", value: "solana" },
              { name: "Ethereum", value: "ethereum" },
              { name: "Base", value: "base" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a coin from your watchlist")
        .addStringOption((option) =>
          option.setName("query").setDescription("Symbol or name as added").setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName("show").setDescription("Show your watchlist with current prices")),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    if (subcommand === "add") {
      const query = interaction.options.getString("query");
      const chain = interaction.options.getString("chain");

      const isPremium = usersRepo.isPremium(discordId);
      const limit = isPremium ? config.premiumLimits.watchlistSlots : config.freeLimits.watchlistSlots;
      const currentCount = watchlistRepo.countWatchlist(discordId);

      if (currentCount >= limit) {
        await interaction.reply(
          "Your watchlist is full (" +
            limit +
            " slots). Premium accounts get up to " +
            config.premiumLimits.watchlistSlots +
            " slots."
        );
        return;
      }

      const added = watchlistRepo.addToWatchlist(discordId, query, chain, null);
      await interaction.reply(added ? "Added " + query.toUpperCase() + " to your watchlist." : "That is already on your watchlist.");
      return;
    }

    if (subcommand === "remove") {
      const query = interaction.options.getString("query");
      const removed = watchlistRepo.removeFromWatchlist(discordId, query);
      await interaction.reply(removed ? "Removed " + query.toUpperCase() + " from your watchlist." : "That was not on your watchlist.");
      return;
    }

    if (subcommand === "show") {
      const items = watchlistRepo.getWatchlist(discordId);
      if (items.length === 0) {
        await interaction.reply("Your watchlist is empty. Use /watchlist add to start tracking coins.");
        return;
      }

      await interaction.deferReply();

      const lines = [];
      for (const item of items) {
        const token = await marketData.lookupToken(item.symbol_or_query, item.chain);
        if (token && token.priceUsd) {
          lines.push(
            "**" +
              item.symbol_or_query +
              "**: " +
              format.formatUsd(token.priceUsd) +
              " (" +
              format.formatPercent(token.change24h) +
              ")"
          );
        } else {
          lines.push("**" + item.symbol_or_query + "**: price unavailable");
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("Your watchlist")
        .setColor(0x5865f2)
        .setDescription(lines.join("\n"))
        .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

      await interaction.editReply({ embeds: [embed] });
    }
  }
};
