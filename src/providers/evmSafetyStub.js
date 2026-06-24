const config = require("../config");

function evmContractSafetyCheckRequiresApiKey(chain) {
  const keyAvailable =
    chain === "ethereum" ? Boolean(config.etherscanApiKey) : Boolean(config.basescanApiKey);

  if (!keyAvailable) {
    return {
      ok: false,
      reason: "missing_api_key",
      chain,
      neededEnvVar: chain === "ethereum" ? "ETHERSCAN_API_KEY" : "BASESCAN_API_KEY",
      message:
        "Deep contract safety checks for " +
        chain +
        " (ownership renounced, honeypot simulation, tax detection) require an Etherscan or Basescan API key plus a honeypot-simulation provider. Add the key in your environment to enable this, or rely on the liquidity and volume data already shown from DexScreener."
    };
  }

  return {
    ok: false,
    reason: "not_implemented",
    chain,
    message:
      "An API key is configured for " +
      chain +
      " but the contract-read integration has not been implemented yet. Liquidity, volume, and pair age from DexScreener are still shown."
  };
}

module.exports = {
  evmContractSafetyCheckRequiresApiKey
};
