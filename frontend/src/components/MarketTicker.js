import { useEffect, useState } from "react";
import api from "../lib/api";

export default function MarketTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    const fetch = () => api.get("/market/ticker").then((r) => alive && setItems(r.data)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="w-full overflow-hidden" style={{ background: "var(--bg-sidebar)", color: "white" }} data-testid="market-ticker">
      <div className="flex items-center gap-6 px-4 py-2.5 overflow-x-auto whitespace-nowrap text-xs">
        {items.map((it) => {
          const up = it.change_pct >= 0;
          return (
            <div key={it.symbol} className="inline-flex items-center gap-2 shrink-0" data-testid={`ticker-${it.symbol.replace(/ /g, "-")}`}>
              <span className="font-display font-semibold tracking-tight" style={{ color: "var(--accent-gold)" }}>{it.symbol}</span>
              <span className="font-mono">{it.value.toLocaleString("en-IN")}</span>
              <span className="font-mono font-semibold" style={{ color: up ? "#5ee7a3" : "#ff8a78" }}>
                {up ? "▲" : "▼"} {Math.abs(it.change_pct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
