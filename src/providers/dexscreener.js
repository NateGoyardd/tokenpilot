const { request } = require("undici");

const BASE_URL = "https://api.dexscreener.com";

const SUPPORTED_CHAINS = ["solana", "ethereum", "base"];

function isLikelyContractAddress(query) {
  const trimmed = query.trim();
  if (trimmed.startsWith("0x") && trimmed.length === 42) {
    return true;
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return true;
  }
  return false;
}

async function searchPairs(query) {
  const response = await request(BASE_URL + "/latest/dex/search?q=" + encodeURIComponent(query));
  if (response.statusCode !== 200) {
    return [];
  }
  const data = await response.body.json();
  return Array.isArray(data.pairs) ? data.pairs : [];
}

async function getPairsByTokenAddress(chain, tokenAddress) {
  const response = await request(BASE_URL + "/tokens/v1/" + chain + "/" + tokenAddress);
  if (response.statusCode !== 200) {
    return [];
  }
  const data = await response.body.json();
  return Array.isArray(data) ? data : [];
}

function pickBestPair(pairs, preferredChain) {
  if (pairs.length === 0) {
    return null;
  }
  let candidates = pairs;
  if (preferredChain) {
    const filtered = pairs.filter((pair) => pair.chainId === preferredChain);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }
  candidates = candidates
    .filter((pair) => SUPPORTED_CHAINS.includes(pair.chainId))
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  return candidates[0] || pairs[0];
}

function normalizePair(pair) {
  return {
    source: "dexscreener",
    chain: pair.chainId,
    dexId: pair.dexId,
    pairAddress: pair.pairAddress,
    baseTokenSymbol: pair.baseToken?.symbol,
    baseTokenName: pair.baseToken?.name,
    baseTokenAddress: pair.baseToken?.address,
    quoteTokenSymbol: pair.quoteToken?.symbol,
    priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
    change24h: pair.priceChange?.h24 ?? null,
    change1h: pair.priceChange?.h1 ?? null,
    liquidityUsd: pair.liquidity?.usd ?? null,
    volume24hUsd: pair.volume?.h24 ?? null,
    marketCapUsd: pair.marketCap ?? pair.fdv ?? null,
    pairCreatedAt: pair.pairCreatedAt ?? null,
    url: pair.url,
    chartUrl: pair.url,
    txns24h: pair.txns?.h24 ?? null
  };
}

async function findToken(query, preferredChain) {
  let pairs = [];

  if (isLikelyContractAddress(query) && preferredChain) {
    pairs = await getPairsByTokenAddress(preferredChain, query);
  }

  if (pairs.length === 0 && isLikelyContractAddress(query)) {
    for (const chain of SUPPORTED_CHAINS) {
      pairs = await getPairsByTokenAddress(chain, query);
      if (pairs.length > 0) {
        break;
      }
    }
  }

  if (pairs.length === 0) {
    pairs = await searchPairs(query);
  }

  const best = pickBestPair(pairs, preferredChain);
  if (!best) {
    return null;
  }
  return normalizePair(best);
}

async function getLatestPairsForChain(chain, query) {
  const pairs = await searchPairs(query);
  return pairs
    .filter((pair) => pair.chainId === chain)
    .map(normalizePair)
    .sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
}

module.exports = {
  SUPPORTED_CHAINS,
  isLikelyContractAddress,
  findToken,
  searchPairs,
  getPairsByTokenAddress,
  normalizePair,
  getLatestPairsForChain
};
