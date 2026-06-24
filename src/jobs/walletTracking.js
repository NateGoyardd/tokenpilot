const walletsRepo = require("../db/wallets");
const helius = require("../providers/helius");
const etherscan = require("../providers/etherscan");
const disclaimers = require("../lib/disclaimers");
const { EmbedBuilder } = require("discord.js");

async function checkSolanaWallet(wallet, client, logger) {
  if (!helius.isConfigured()) {
    return;
  }

  const result = await helius.getRecentTransactionsForWallet(wallet.wallet_address);
  if (!result.ok || result.transactions.length === 0) {
    return;
  }

  const newest = result.transactions[0];
  const signature = newest.signature;

  if (wallet.last_signature && wallet.last_signature === signature) {
    return;
  }

  walletsRepo.updateLastSignature(wallet.id, signature);

  if (!wallet.last_signature) {
    return;
  }

  const channel = await client.channels.fetch(wallet.channel_id).catch(() => null);
  if (!channel) {
    return;
  }

  const description = newest.description || "Wallet activity detected";

  const embed = new EmbedBuilder()
    .setTitle("Wallet activity: " + (wallet.label || wallet.wallet_address))
    .setColor(0x5865f2)
    .setDescription(description)
    .addFields({ name: "Signature", value: signature })
    .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

  await channel.send({ content: "<@" + wallet.discord_id + ">", embeds: [embed] });
}

async function checkEvmWallet(wallet, client, logger) {
  if (!etherscan.isConfigured(wallet.chain)) {
    return;
  }

  const result = await etherscan.getRecentTokenTransfersForWallet(wallet.chain, wallet.wallet_address);
  if (!result.ok || result.transfers.length === 0) {
    return;
  }

  const newest = result.transfers[0];
  const txHash = newest.hash;

  if (wallet.last_signature && wallet.last_signature === txHash) {
    return;
  }

  walletsRepo.updateLastSignature(wallet.id, txHash);

  if (!wallet.last_signature) {
    return;
  }

  const channel = await client.channels.fetch(wallet.channel_id).catch(() => null);
  if (!channel) {
    return;
  }

  const direction = newest.to && newest.to.toLowerCase() === wallet.wallet_address.toLowerCase() ? "received" : "sent";

  const embed = new EmbedBuilder()
    .setTitle("Wallet activity: " + (wallet.label || wallet.wallet_address))
    .setColor(0x5865f2)
    .addFields(
      { name: "Direction", value: direction, inline: true },
      { name: "Token", value: newest.tokenSymbol || "Unknown", inline: true },
      { name: "Tx hash", value: txHash }
    )
    .setFooter({ text: disclaimers.SHORT_DISCLAIMER });

  await channel.send({ content: "<@" + wallet.discord_id + ">", embeds: [embed] });
}

async function checkTrackedWallets(client, logger) {
  const wallets = walletsRepo.getAllActiveTrackedWallets();

  for (const wallet of wallets) {
    try {
      if (wallet.chain === "solana") {
        await checkSolanaWallet(wallet, client, logger);
      } else {
        await checkEvmWallet(wallet, client, logger);
      }
    } catch (error) {
      logger.error("Failed to check tracked wallet", wallet.id, error);
    }
  }
}

module.exports = { checkTrackedWallets };
