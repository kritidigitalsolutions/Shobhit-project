import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { fmtINR, fmtPct } from "../utils/format";
import { Receipt, Shield, TrendingUp } from "lucide-react";

export default function TaxCenter() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/tax").then((r) => setData(r.data)); }, []);

  if (!data) return <div className="overline">Loading tax center…</div>;
  const { summary, recommendations } = data;

  return (
    <div className="space-y-6 animate-in" data-testid="tax-center">
      <div>
        <div className="overline mb-2">Plan · FY 2025-26</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Tax Center</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Save up to ₹46,800 annually with ELSS funds under Section 80C.
        </p>
      </div>

      {/* 80C banner */}
      <div className="gold-edge p-7 lg:p-8 relative">
        <div className="grid md:grid-cols-3 gap-6 relative z-10">
          <div className="md:col-span-2">
            <div className="overline text-white/60 mb-2">Section 80C Utilization</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-4xl font-bold tracking-tight text-white">
                {fmtINR(summary.elss_invested, { compact: true })}
              </div>
              <div className="text-white/60 text-sm">of {fmtINR(summary.section_80c_limit, { compact: true })}</div>
            </div>
            <div className="h-2 mt-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full" style={{ width: `${summary.section_80c_pct}%`, background: "var(--accent-gold)" }} />
            </div>
            <div className="flex items-center gap-3 mt-4 text-sm">
              <span className="tag tag-gold">{summary.section_80c_pct}% used</span>
              <span className="text-white/70">₹{summary.section_80c_remaining.toLocaleString("en-IN")} remaining</span>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="overline text-white/60 mb-2">Potential Tax Savings</div>
            <div className="font-display text-3xl font-bold tracking-tight" style={{ color: "var(--accent-gold)" }}>
              {fmtINR(summary.estimated_tax_saving, { compact: true })}
            </div>
            <Link to="/funds" className="btn-gold mt-4 self-start" data-testid="tax-invest-elss-btn">
              Invest in ELSS
            </Link>
          </div>
        </div>
      </div>

      {/* Capital gains grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: "var(--border-soft)" }}>
        <Stat icon={Shield} label="ELSS Invested" value={fmtINR(summary.elss_invested)} testid="stat-elss" />
        <Stat icon={TrendingUp} label="Unrealized Gains" value={fmtINR(summary.unrealized_gains)} tone={summary.unrealized_gains >= 0 ? "pos" : "neg"} testid="stat-unrealized" />
        <Stat icon={Receipt} label="Realized LTCG (FY)" value={fmtINR(summary.realized_ltcg)} sub="0% up to ₹1.25L" testid="stat-ltcg" />
      </div>

      {/* Recommendations */}
      <div className="surface p-6">
        <div className="overline mb-1">Save tax</div>
        <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Recommended ELSS Funds</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {recommendations.map((f) => (
            <Link to={`/funds/${f.id}`} key={f.id} className="surface-flat p-4 hover:border-[var(--brand)] transition" data-testid={`tax-fund-${f.id}`}>
              <div className="font-display font-semibold tracking-tight text-sm truncate">{f.name}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{f.amc}</div>
              <div className="flex items-center justify-between mt-4">
                <span className="tag tag-gold">★ {f.rating}</span>
                <span className={`font-mono text-sm font-semibold ${f.returns_3y >= 0 ? "positive" : "negative"}`}>
                  3Y {fmtPct(f.returns_3y)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="surface-flat p-5 text-xs" style={{ color: "var(--text-secondary)" }}>
        <strong>Disclaimer:</strong> Tax calculations are illustrative and assume 30% slab. ELSS has a mandatory 3-year lock-in. LTCG on equity above ₹1.25L is taxed at 12.5%. Consult your CA before investing.
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone, testid }) {
  const t = tone === "pos" ? "positive" : tone === "neg" ? "negative" : "";
  return (
    <div className="kpi-tile" data-testid={testid}>
      <div className="flex items-center justify-between mb-4">
        <div className="overline">{label}</div>
        <Icon size={18} style={{ color: "var(--text-muted)" }} />
      </div>
      <div className={`font-display text-2xl font-bold tracking-tight ${t}`}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}
