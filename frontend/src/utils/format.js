export const fmtINR = (n, opts = {}) => {
  if (n == null || isNaN(n)) return "₹0";
  const { compact = false, decimals = 0 } = opts;
  if (compact) {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  }
  return `₹${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const fmtPct = (n, decimals = 2) => {
  if (n == null || isNaN(n)) return "0%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Number(n).toFixed(decimals)}%`;
};

export const fmtNum = (n, decimals = 2) => {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
