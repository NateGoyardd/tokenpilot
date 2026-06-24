const { Client, GatewayIntentBits, Collection } = require("discord.js");
const cron = require("node-cron");
const config = require("./config");
const { loadCommands } = require("./lib/loadCommands");
const { makeLogger } = require("./lib/logger");
const { checkPriceAlerts } = require("./jobs/priceAlerts");
const { checkNewCoins } = require("./jobs/newCoinAlerts");
const { checkWhaleActivity } = require("./jobs/whaleAlerts");
const { checkTrackedWallets } = require("./jobs/walletTracking");

const logger = makeLogger(config.logLevel);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
const loadedCommands = loadCommands();
for (const [name, command] of loadedCommands) {
  client.commands.set(name, command);
}

client.once("ready", () => {
  logger.info("Logged in as " + client.user.tag);

  const alertCronSeconds = Math.max(config.alertPollSeconds, 15);
  cron.schedule("*/" + alertCronSeconds + " * * * * *", () => {
    checkPriceAlerts(client, logger).catch((error) => logger.error("Price alert job failed", error));
  });

  const newCoinCronSeconds = Math.max(config.newPairPollSeconds, 30);
  cron.schedule("*/" + newCoinCronSeconds + " * * * * *", () => {
    checkNewCoins(client, logger).catch((error) => logger.error("New coin alert job failed", error));
    checkWhaleActivity(client, logger).catch((error) => logger.error("Whale alert job failed", error));
  });

  cron.schedule("*/90 * * * * *", () => {
    checkTrackedWallets(client, logger).catch((error) => logger.error("Wallet tracking job failed", error));
  });

  logger.info("Background jobs scheduled");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error("Command execution failed", interaction.commandName, error);
    const errorMessage = "Something went wrong running that command. Please try again.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage).catch(() => {});
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
    }
  }
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", error);
});

client.login(config.discordToken);
