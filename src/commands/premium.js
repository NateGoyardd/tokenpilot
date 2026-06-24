const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const usersRepo = require("../db/users");
const config = require("../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("premium")
    .setDescription("Check or manage premium status")
    .addSubcommand((sub) => sub.setName("status").setDescription("Check your premium status"))
    .addSubcommand((sub) =>
      sub
        .setName("grant")
        .setDescription("Grant premium to a user, admin only")
        .addUserOption((option) => option.setName("user").setDescription("User to grant premium to").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("revoke")
        .setDescription("Revoke premium from a user, admin only")
        .addUserOption((option) => option.setName("user").setDescription("User to revoke premium from").setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "status") {
      const isPremium = usersRepo.isPremium(interaction.user.id);
      await interaction.reply(
        isPremium
          ? "You have premium access with higher limits on watchlists, alerts, and tracked wallets."
          : "You are on the free tier. Free limits: " +
              config.freeLimits.watchlistSlots +
              " watchlist slots, " +
              config.freeLimits.priceAlertSlots +
              " price alerts, " +
              config.freeLimits.trackedWallets +
              " tracked wallet."
      );
      return;
    }

    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      await interaction.reply({ content: "Only server administrators can manage premium status.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("user");

    if (subcommand === "grant") {
      usersRepo.setPremium(targetUser.id, true);
      await interaction.reply("Granted premium access to " + targetUser.username + ".");
      return;
    }

    if (subcommand === "revoke") {
      usersRepo.setPremium(targetUser.id, false);
      await interaction.reply("Revoked premium access from " + targetUser.username + ".");
    }
  }
};
