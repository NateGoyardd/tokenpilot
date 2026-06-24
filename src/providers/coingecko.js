const { request } = require("undici");

const BASE_URL = "https://api.coingecko.com/api/v3";

let cachedCoinList = null;
let cachedCoinListAt = 0;
const COIN_LIST_TTL_MS = 1000 * 60 * 60 * 6;

async function getCoinList() {
  const now = Date.now();
  if (cachedCoinList && now - cachedCoinListAt < COIN_LIST_TTL_MS) {
    return cachedCoinList;
  }
  const response = await request(BASE_URL + "/coins/list");
  if (response.statusCode !== 200) {
    return cachedCoinList || [];
  }
  const data = await response.body.json();
  cachedCoinList = data;
  cachedCoinListAt = now;
  return data;
}

async function findCoinIdBySymbolOrName(query) {
  const list = await getCoinList();
  const lowered = query.toLowerCase();

  const exactSymbolMatches = list.filter((coin) => coin.symbol.toLowerCase() === lowered);
  if (exactSymbolMatches.length === 1) {
    return exactSymbolMatches[0].id;
  }
  if (exactSymbolMatches.length > 1) {
    const byMarketCap = await pickHighestMarketCap(exactSymbolMatches.map((coin) => coin.id));
    if (byMarketCap) {
      return byMarketCap;
    }
    return exactSymbolMatches[0].id;
  }

  const exactNameMatch = list.find((coin) => coin.name.toLowerCase() === lowered);
  if (exactNameMatch) {
    return exactNameMatch.id;
  }

  return null;
}

async function pickHighestMarketCap(coinIds) {
  if (coinIds.length === 0) {
    return null;
  }
  const idsParam = coinIds.slice(0, 50).join(",");
  const response = await request(
    BASE_URL + "/coins/markets?vs_currency=usd&ids=" + idsParam + "&order=market_cap_desc"
  );
  if (response.statusCode !== 200) {
    return null;
  }
  const data = await response.body.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0].id;
  }
  return null;
}

async function getMarketDataById(coinId) {
  const response = await request(
    BASE_URL +
      "/coins/markets?vs_currency=usd&ids=" +
      coinId +
      "&price_change_percentage=24h"
  );
  if (response.statusCode !== 200) {
    return null;
  }
  const data = await response.body.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  const coin = data[0];
  return {
    source: "coingecko",
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    priceUsd: coin.current_price,
    change24h: coin.price_change_percentage_24h,
    marketCapUsd: coin.market_cap,
    volume24hUsd: coin.total_volume,
    chartUrl: "https://www.coingecko.com/en/coins/" + coin.id
  };
}

async function getPriceBySymbolOrName(query) {
  const coinId = await findCoinIdBySymbolOrName(query);
  if (!coinId) {
    return null;
  }
  return getMarketDataById(coinId);
}

async function getTrendingCoins() {
  const response = await request(BASE_URL + "/search/trending");
  if (response.statusCode !== 200) {
    return [];
  }
  const data = await response.body.json();
  if (!data.coins) {
    return [];
  }
  return data.coins.slice(0, 10).map((entry) => ({
    symbol: entry.item.symbol.toUpperCase(),
    name: entry.item.name,
    marketCapRank: entry.item.market_cap_rank,
    priceUsd: entry.item.data ? entry.item.data.price : null,
    chartUrl: "https://www.coingecko.com/en/coins/" + entry.item.id
  }));
}

module.exports = {
  getPriceBySymbolOrName,
  getTrendingCoins
};
