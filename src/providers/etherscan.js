const { request } = require("undici");
const config = require("../config");

function getApiKeyForChain(chain) {
  return chain === "ethereum" ? config.etherscanApiKey : config.basescanApiKey;
}

function getBaseUrlForChain(chain) {
  return chain === "ethereum" ? "https://api.etherscan.io/api" : "https://api.basescan.org/api";
}

function isConfigured(chain) {
  return Boolean(getApiKeyForChain(chain));
}

async function getRecentTokenTransfersForWallet(chain, walletAddress) {
  const apiKey = getApiKeyForChain(chain);

  if (!apiKey) {
    return {
      ok: false,
      reason: "missing_api_key",
      neededEnvVar: chain === "ethereum" ? "ETHERSCAN_API_KEY" : "BASESCAN_API_KEY",
      message:
        "Wallet buy and sell tracking on " +
        chain +
        " requires an API key from " +
        (chain === "ethereum" ? "etherscan.io" : "basescan.org") +
        ". Add the key to enable real-time wallet alerts on this chain."
    };
  }

  const url =
    getBaseUrlForChain(chain) +
    "?module=account&action=tokentx&address=" +
    walletAddress +
    "&sort=desc&apikey=" +
    apiKey;

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

  if (data.status !== "1" || !Array.isArray(data.result)) {
    return { ok: false, reason: "no_data" };
  }

  return { ok: true, transfers: data.result.slice(0, 10) };
}

module.exports = {
  isConfigured,
  getRecentTokenTransfersForWallet
};
