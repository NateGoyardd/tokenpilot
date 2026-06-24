const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const walletsRepo = require("../db/wallets");
const usersRepo = require("../db/users");
const config = require("../config");
const disclaimers = require("../lib/disclaimers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trackwallet")
    .setDescription("Track a public wallet and get alerted on its buys and sells")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Start tracking a wallet")
        .addStringOption((option) =>
          option.setName("address").setDescription("Wallet address").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("chain")
            .setDescription("Chain the wallet is on")
            .setRequired(true)
            .addChoices(
              { name: "Solana", value: "solana" },
              { name: "Ethereum", value: "ethereum" },
              { name: "Base", value: "base" }
            )
        )
        .addStringOption((option) => option.setName("label").setDescription("Optional label for this wallet"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Stop tracking a wallet")
        .addStringOption((option) =>
          option.setName("address").setDescription("Wallet address").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("chain")
            .setDescription("Chain the wallet is on")
            .setRequired(true)
            .addChoices(
              { name: "Solana", value: "solana" },
              { name: "Ethereum", value: "ethereum" },
              { name: "Base", value: "base" }
            )
        )
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List wallets you are tracking")),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    if (subcommand === "add") {
      const address = interaction.options.getString("address");
      const chain = interaction.options.getString("chain");
      const label = interaction.options.getString("label");

      const isPremium = usersRepo.isPremium(discordId);
      const limit = isPremium ? config.premiumLimits.trackedWallets : config.freeLimits.trackedWallets;
      const currentCount = walletsRepo.countTrackedWallets(discordId);

      if (currentCount >= limit) {
        await interaction.reply(
          "You have reached your tracked wallet limit (" +
            limit +
            "). Premium accounts can track up to " +
            config.premiumLimits.trackedWallets +
            " wallets."
        );
        return;
      }

      const added = walletsRepo.trackWallet(discordId, interaction.channelId, chain, address, label);

      if (!added) {
        await interaction.reply("You are already tracking that wallet.");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("Now tracking wallet")
        .setColor(0x57f287)
        .addFields(
          { name: "Address", value: address, inline: false },
          { name: "Chain", value: chain, inline: true },
          { name: "Label", value: label || "None", inline: true }
        )
        .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "remove") {
      const address = interaction.options.getString("address");
      const chain = interaction.options.getString("chain");
      const removed = walletsRepo.untrackWallet(discordId, chain, address);
      await interaction.reply(removed ? "Stopped tracking that wallet." : "That wallet was not on your tracked list.");
      return;
    }

    if (subcommand === "list") {
      const wallets = walletsRepo.getUserTrackedWallets(discordId);
      if (wallets.length === 0) {
        await interaction.reply("You are not tracking any wallets yet. Use /trackwallet add to start.");
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle("Your tracked wallets")
        .setColor(0x5865f2)
        .setDescription(
          wallets
            .map((wallet) => "**" + (wallet.label || "Unlabeled") + "** (" + wallet.chain + "): " + wallet.wallet_address)
            .join("\n")
        );
      await interaction.reply({ embeds: [embed] });
    }
  }
};
