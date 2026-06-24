const coingecko = require("../providers/coingecko");
const dexscreener = require("../providers/dexscreener");

async function lookupToken(query, preferredChain) {
  const dexResult = await dexscreener.findToken(query, preferredChain);
  if (dexResult && dexResult.priceUsd) {
    return dexResult;
  }

  const geckoResult = await coingecko.getPriceBySymbolOrName(query);
  if (geckoResult) {
    return geckoResult;
  }

  return dexResult || null;
}

module.exports = {
  lookupToken
};
