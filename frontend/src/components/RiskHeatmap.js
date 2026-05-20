import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fmtINR } from "../utils/format";
import { AlertTriangle, Megaphone } from "lucide-react";

export default function RiskHeatmap() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.get("/admin/risk-heatmap").then((r) => setData(r.data)); }, []);

  if (!data) return null;
  const { rows, risks, total_aum, max_cell, warnings } = data;

  const colorFor = (v) => {
    if (!max_cell || v === 0) return { bg: "var(--bg-elevated)", color: "var(--text-muted)" };
    const intensity = Math.min(1, v / max_cell);
    // Gold-to-navy ramp on intensity
    if (intensity > 0.66) return { bg: "var(--brand)", color: "white" };
    if (intensity > 0.33) return { bg: "rgba(15,42,92,0.5)", color: "white" };
    return { bg: "rgba(15,42,92,0.18)", color: "var(--text-primary)" };
  };

  const nudge = (cat, risk) => {
    const title = `Rebalance suggestion · ${cat}`;
    const body = `You're overweight on ${risk.toLowerCase()}-risk ${cat} funds. Consider trimming or starting a SIP in a complementary category to reduce concentration.`;
    navigate(`/admin/broadcast?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="surface p-6" data-testid="risk-heatmap">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="overline mb-1">Concentration</div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Risk Heatmap</h2>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Platform AUM: <span className="font-mono font-semibold">{fmtINR(total_aum, { compact: true })}</span>
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md" style={{ background: "var(--accent-gold-soft)", color: "#8a6a18" }} data-testid="heatmap-warning">
            <AlertTriangle size={13} /> {warnings.length} concentration{warnings.length === 1 ? "" : "s"} above 40%
          </div>
        )}
      </div>

      {/* Grid header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[10px] uppercase tracking-wider font-semibold pb-3" style={{ color: "var(--text-muted)" }}>Category</th>
              {risks.map((r) => (
                <th key={r} className="text-center text-[10px] uppercase tracking-wider font-semibold pb-3 px-2" style={{ color: "var(--text-muted)" }}>
                  {r} risk
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} data-testid={`heatmap-row-${row.category}`}>
                <td className="text-sm font-medium py-1 pr-3">{row.category}</td>
                {row.cells.map((c) => {
                  const { bg, color } = colorFor(c.aum);
                  const hot = c.pct >= 40;
                  return (
                    <td key={c.risk} className="py-1 px-1">
                      <button
                        onClick={() => c.aum > 0 && nudge(row.category, c.risk)}
                        disabled={c.aum === 0}
                        className="w-full rounded-md py-3 px-2 text-center transition hover:scale-[1.02] disabled:cursor-default disabled:hover:scale-100 relative"
                        style={{ background: bg, color, border: hot ? "2px solid var(--accent-gold)" : "1px solid transparent" }}
                        data-testid={`heatmap-cell-${row.category}-${c.risk}`}
                        title={c.aum > 0 ? `${fmtINR(c.aum, { compact: true })} · click to send rebalancing nudge` : "No exposure"}
                      >
                        <div className="font-mono text-xs font-bold">{c.aum === 0 ? "—" : fmtINR(c.aum, { compact: true })}</div>
                        <div className="text-[10px] mt-0.5 opacity-80">{c.pct.toFixed(1)}%</div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {warnings.length > 0 && (
        <div className="mt-5 surface-flat p-3 flex items-start gap-3">
          <Megaphone size={15} style={{ color: "var(--accent-gold)" }} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            High concentration in{" "}
            {warnings.map((w, i) => (
              <span key={`${w.category}-${w.risk}`}>
                {i > 0 && ", "}
                <strong>{w.category} ({w.risk}) · {w.pct}%</strong>
              </span>
            ))}
            . Click any hot cell to compose a rebalancing nudge.
          </div>
        </div>
      )}
    </div>
  );
}
