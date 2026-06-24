const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const alertsRepo = require("../db/alerts");
const usersRepo = require("../db/users");
const config = require("../config");
const marketData = require("../lib/marketData");
const format = require("../lib/format");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("alert")
    .setDescription("Manage price target alerts")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a price alert")
        .addStringOption((option) =>
          option.setName("query").setDescription("Symbol, name, or contract address").setRequired(true)
        )
        .addNumberOption((option) =>
          option.setName("target").setDescription("Target price in USD").setRequired(true)
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
    .addSubcommand((sub) => sub.setName("list").setDescription("List your active alerts"))
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove an alert by id")
        .addIntegerOption((option) => option.setName("id").setDescription("Alert id from /alert list").setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    if (subcommand === "set") {
      const query = interaction.options.getString("query");
      const target = interaction.options.getNumber("target");
      const chain = interaction.options.getString("chain");

      const isPremium = usersRepo.isPremium(discordId);
      const limit = isPremium ? config.premiumLimits.priceAlertSlots : config.freeLimits.priceAlertSlots;
      const currentCount = alertsRepo.countActiveAlerts(discordId);

      if (currentCount >= limit) {
        await interaction.reply(
          "You have reached your alert limit (" +
            limit +
            "). Premium accounts can have up to " +
            config.premiumLimits.priceAlertSlots +
            " active alerts."
        );
        return;
      }

      await interaction.deferReply();

      const token = await marketData.lookupToken(query, chain);
      if (!token || !token.priceUsd) {
        await interaction.editReply("Could not find current price for \"" + query + "\". Try a contract address.");
        return;
      }

      const direction = target >= token.priceUsd ? "above" : "below";
      const tokenAddress = token.baseTokenAddress || null;
      const resolvedChain = token.chain || chain || null;

      const alertId = alertsRepo.createAlert(
        discordId,
        interaction.channelId,
        query,
        resolvedChain,
        tokenAddress,
        direction,
        target
      );

      const embed = new EmbedBuilder()
        .setTitle("Alert set")
        .setColor(0x57f287)
        .addFields(
          { name: "Token", value: query, inline: true },
          { name: "Current price", value: format.formatUsd(token.priceUsd), inline: true },
          { name: "Target", value: format.formatUsd(target) + " (" + direction + ")", inline: true },
          { name: "Alert id", value: String(alertId), inline: true }
        )
        .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "list") {
      const alerts = alertsRepo.getUserAlerts(discordId);
      if (alerts.length === 0) {
        await interaction.reply("You have no active alerts. Use /alert set to create one.");
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle("Your active alerts")
        .setColor(0x5865f2)
        .setDescription(
          alerts
            .map(
              (alert) =>
                "id " +
                alert.id +
                ": **" +
                alert.symbol_or_query +
                "** " +
                alert.direction +
                " " +
                format.formatUsd(alert.target_price)
            )
            .join("\n")
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "remove") {
      const id = interaction.options.getInteger("id");
      const removed = alertsRepo.removeAlert(discordId, id);
      await interaction.reply(removed ? "Alert removed." : "No alert with that id was found on your account.");
    }
  }
};
