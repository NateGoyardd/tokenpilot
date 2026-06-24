require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

function optionalEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const config = {
  discordToken: requireEnv("DISCORD_TOKEN"),
  discordClientId: requireEnv("DISCORD_CLIENT_ID"),
  discordGuildId: optionalEnv("DISCORD_GUILD_ID", ""),
  databasePath: optionalEnv("DATABASE_PATH", "./data/memebot.sqlite"),
  premiumRoleId: optionalEnv("PREMIUM_ROLE_ID", ""),
  heliusApiKey: optionalEnv("HELIUS_API_KEY", ""),
  etherscanApiKey: optionalEnv("ETHERSCAN_API_KEY", ""),
  basescanApiKey: optionalEnv("BASESCAN_API_KEY", ""),
  birdeyeApiKey: optionalEnv("BIRDEYE_API_KEY", ""),
  alertPollSeconds: Number(optionalEnv("ALERT_POLL_SECONDS", "60")),
  newPairPollSeconds: Number(optionalEnv("NEWPAIR_POLL_SECONDS", "120")),
  whaleUsdThreshold: Number(optionalEnv("WHALE_USD_THRESHOLD", "5000")),
  logLevel: optionalEnv("LOG_LEVEL", "info"),
  freeLimits: {
    watchlistSlots: 10,
    priceAlertSlots: 5,
    trackedWallets: 1
  },
  premiumLimits: {
    watchlistSlots: 100,
    priceAlertSlots: 50,
    trackedWallets: 20
  }
};

module.exports = config;
