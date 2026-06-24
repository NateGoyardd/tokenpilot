const { request } = require("undici");

const BASE_URL = "https://api.rugcheck.xyz/v1";

async function getSolanaReport(tokenAddress) {
  let response;
  try {
    response = await request(BASE_URL + "/tokens/" + tokenAddress + "/report/summary");
  } catch (error) {
    return { ok: false, reason: "network_error", error: String(error) };
  }

  if (response.statusCode === 404) {
    return { ok: false, reason: "not_found" };
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

  const risks = Array.isArray(data.risks) ? data.risks : [];
  const topHolders = Array.isArray(data.topHolders) ? data.topHolders : [];
  const topHolderPercent = topHolders.slice(0, 10).reduce((sum, holder) => {
    return sum + (holder.pct || 0);
  }, 0);

  return {
    ok: true,
    source: "rugcheck.xyz",
    score: data.score ?? null,
    riskLevel: data.score_normalised ?? data.scoreNormalised ?? null,
    mintAuthorityDisabled: data.token?.mintAuthority === null,
    freezeAuthorityDisabled: data.token?.freezeAuthority === null,
    lpLockedPercent: data.markets?.[0]?.lp?.lpLockedPct ?? null,
    topHolderPercent,
    creatorAddress: data.creator ?? null,
    risks: risks.map((risk) => ({
      name: risk.name,
      description: risk.description,
      level: risk.level
    }))
  };
}

module.exports = {
  getSolanaReport
};
