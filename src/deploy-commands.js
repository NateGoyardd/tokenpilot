const { REST, Routes } = require("discord.js");
const config = require("./config");
const { loadCommands } = require("./lib/loadCommands");
const { makeLogger } = require("./lib/logger");

const logger = makeLogger(config.logLevel);

async function main() {
  const commands = loadCommands();
  const body = Array.from(commands.values()).map((command) => command.data.toJSON());

  const rest = new REST().setToken(config.discordToken);

  const useGuildOnly = process.argv.includes("--guild");

  if (useGuildOnly) {
    if (!config.discordGuildId) {
      logger.error("DISCORD_GUILD_ID is not set, cannot deploy guild-only commands");
      process.exit(1);
    }
    await rest.put(Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId), {
      body
    });
    logger.info("Deployed " + body.length + " commands to guild " + config.discordGuildId);
    return;
  }

  await rest.put(Routes.applicationCommands(config.discordClientId), { body });
  logger.info("Deployed " + body.length + " global commands. This can take up to an hour to propagate.");
}

main().catch((error) => {
  logger.error("Failed to deploy commands", error);
  process.exit(1);
});
