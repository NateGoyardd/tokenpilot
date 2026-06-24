const { request } = require("undici");
const config = require("../config");

function isConfigured() {
  return Boolean(config.heliusApiKey);
}

async function getRecentTransactionsForWallet(walletAddress) {
  if (!isConfigured()) {
    return {
      ok: false,
      reason: "missing_api_key",
      neededEnvVar: "HELIUS_API_KEY",
      message:
        "Wallet buy and sell tracking on Solana requires a Helius API key (free tier available at helius.dev). Add HELIUS_API_KEY to enable real-time wallet alerts."
    };
  }

  const url =
    "https://api.helius.xyz/v0/addresses/" +
    walletAddress +
    "/transactions?api-key=" +
    config.heliusApiKey +
    "&limit=10";

  let response;
  try {
    response = await request(url);
  } catch (error) {
    return { ok: false, reason: "network_error", error: String(error) };
  }

  if (response.statusCode !== 200) {
    return { ok: false, reason: "provider_error", status: response.statusCode };
  }

  let data;
  try {
    data = await response.body.json();
  } catch (error) {
    return { ok: false, reason: "parse_error" };
  }

  return { ok: true, transactions: Array.isArray(data) ? data : [] };
}

module.exports = {
  isConfigured,
  getRecentTransactionsForWallet
};
