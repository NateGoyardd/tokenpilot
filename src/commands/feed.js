const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const feedSubscriptionsRepo = require("../db/feedSubscriptions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feed")
    .setDescription("Subscribe this channel to automatic alert feeds, admin only")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("newcoins")
        .setDescription("Post new pair alerts to this channel")
        .addStringOption((option) =>
          option
            .setName("chain")
            .setDescription("Chain to monitor")
            .setRequired(true)
            .addChoices(
              { name: "Solana", value: "solana" },
              { name: "Ethereum", value: "ethereum" },
              { name: "Base", value: "base" }
            )
        )
        .addStringOption((option) =>
          option.setName("query").setDescription("Optional keyword filter, defaults to a broad scan")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("whale")
        .setDescription("Post large volume alerts for a specific token to this channel")
        .addStringOption((option) =>
          option.setName("query").setDescription("Symbol or contract address to monitor").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("chain")
            .setDescription("Chain the token is on")
            .addChoices(
              { name: "Solana", value: "solana" },
              { name: "Ethereum", value: "ethereum" },
              { name: "Base", value: "base" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stop")
        .setDescription("Stop a feed in this channel")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Feed type to stop")
            .setRequired(true)
            .addChoices({ name: "New coins", value: "newcoins" }, { name: "Whale", value: "whale" })
        )
        .addStringOption((option) => option.setName("chain").setDescription("Chain used when subscribing"))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guildId) {
      await interaction.reply("Feeds can only be set up inside a server channel.");
      return;
    }

    if (subcommand === "newcoins") {
      const chain = interaction.options.getString("chain");
      const query = interaction.options.getString("query");
      const added = feedSubscriptionsRepo.subscribe(interaction.guildId, interaction.channelId, "newcoins", chain, query);
      await interaction.reply(
        added
          ? "This channel will now receive new pair alerts for " + chain + "."
          : "This channel is already subscribed to that feed."
      );
      return;
    }

    if (subcommand === "whale") {
      const query = interaction.options.getString("query");
      const chain = interaction.options.getString("chain");
      const added = feedSubscriptionsRepo.subscribe(interaction.guildId, interaction.channelId, "whale", chain, query);
      await interaction.reply(
        added
          ? "This channel will now receive large volume alerts for " + query.toUpperCase() + "."
          : "This channel is already subscribed to that feed."
      );
      return;
    }

    if (subcommand === "stop") {
      const type = interaction.options.getString("type");
      const chain = interaction.options.getString("chain");
      const removed = feedSubscriptionsRepo.unsubscribe(interaction.guildId, interaction.channelId, type, chain);
      await interaction.reply(removed ? "Feed stopped in this channel." : "No matching feed was found in this channel.");
    }
  }
};
