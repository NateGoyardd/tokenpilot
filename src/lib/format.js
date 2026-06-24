function formatUsd(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }
  const abs = Math.abs(value);
  if (abs < 0.00001) {
    return "$" + value.toFixed(10).replace(/0+$/, "");
  }
  if (abs < 1) {
    return "$" + value.toFixed(6);
  }
  if (abs < 1000) {
    return "$" + value.toFixed(4);
  }
  return "$" + value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatCompactUsd(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return "$" + (value / 1_000_000_000).toFixed(2) + "B";
  }
  if (abs >= 1_000_000) {
    return "$" + (value / 1_000_000).toFixed(2) + "M";
  }
  if (abs >= 1_000) {
    return "$" + (value / 1_000).toFixed(2) + "K";
  }
  return "$" + value.toFixed(2);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }
  const sign = value >= 0 ? "+" : "";
  return sign + value.toFixed(2) + "%";
}

function formatAge(timestampMs) {
  if (!timestampMs) {
    return "Unknown";
  }
  const diffMs = Date.now() - timestampMs;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return minutes + "m";
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + "h";
  }
  const days = Math.floor(hours / 24);
  return days + "d";
}

function truncateAddress(address) {
  if (!address || address.length < 10) {
    return address || "Unknown";
  }
  return address.slice(0, 6) + "..." + address.slice(-4);
}

module.exports = {
  formatUsd,
  formatCompactUsd,
  formatPercent,
  formatAge,
  truncateAddress
};
