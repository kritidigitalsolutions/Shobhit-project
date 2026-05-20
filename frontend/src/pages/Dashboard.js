import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { fmtINR, fmtPct, fmtNum } from "../utils/format";
import { TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, ArrowUpRight, IndianRupee } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import WeeklyDigest from "../components/WeeklyDigest";

const COLORS = ["#0F2A5C", "#C9A95C", "#4DB6E5", "#2FB574", "#E5614C", "#6B8FB8"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [sips, setSips] = useState([]);
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/portfolio"), api.get("/sips"), api.get("/transactions")]).then(([p, s, t]) => {
      setData(p.data);
      setSips(s.data);
      setTxns(t.data);
    });
  }, []);

  if (!data) {
    return <div className="overline">Loading portfolio…</div>;
  }

  const { summary, holdings } = data;
  const isPositive = summary.pnl >= 0;
  const activeSips = sips.filter((s) => s.status === "active");

  // Build a simulated growth area chart from holdings
  const chartData = (() => {
    const points = 12;
    const out = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const val = summary.invested + (summary.current_value - summary.invested) * t * (0.6 + 0.4 * Math.sin(i / 2));
      out.push({ month: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i], value: Math.round(val) });
    }
    out[out.length - 1].value = summary.current_value;
    return out;
  })();

  return (
    <div className="space-y-8 animate-in" data-testid="portfolio-dashboard">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Investor Cockpit</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Portfolio</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/funds" data-testid="quick-invest-btn" className="btn-brand">
            Invest now <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {/* Weekly AI Digest */}
      <WeeklyDigest />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border-soft)" }}>
        <KPI icon={Wallet} label="Current Value" value={fmtINR(summary.current_value)} testid="kpi-current-value" />
        <KPI icon={IndianRupee} label="Invested" value={fmtINR(summary.invested)} testid="kpi-invested" />
        <KPI
          icon={isPositive ? TrendingUp : TrendingDown}
          label="Total P&L"
          value={fmtINR(summary.pnl)}
          tone={isPositive ? "pos" : "neg"}
          subtitle={fmtPct(summary.pnl_pct)}
          testid="kpi-pnl"
        />
        <KPI icon={PieIcon} label="Holdings" value={summary.holdings_count} subtitle={`${activeSips.length} active SIPs`} testid="kpi-holdings-count" />
      </div>

      {/* Growth chart + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="overline mb-1">Portfolio Trend</div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Last 12 months</h2>
            </div>
            <div className={`text-sm font-semibold ${isPositive ? "positive" : "negative"}`}>
              {fmtPct(summary.pnl_pct)} overall
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F2A5C" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0F2A5C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E6ECF3", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmtINR(v)} />
                <Area type="monotone" dataKey="value" stroke="#0F2A5C" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-6">
          <div className="overline mb-1">Allocation</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">By Category</h2>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={summary.allocation} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {summary.allocation.map((a, i) => (
                    <Cell key={a.name} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "#fff", border: "1px solid #E6ECF3", borderRadius: 6, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {summary.allocation.map((a, i) => (
              <div key={a.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                  <span style={{ color: "var(--text-secondary)" }}>{a.name}</span>
                </div>
                <span className="font-mono text-xs">{fmtINR(a.value, { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="surface overflow-hidden" data-testid="holdings-table">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <div className="overline mb-1">Your Funds</div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Holdings</h2>
          </div>
          <Link to="/funds" className="text-sm font-medium" style={{ color: "var(--brand)" }} data-testid="explore-funds-link">
            Explore more →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fund</th>
                <th>Category</th>
                <th className="text-right">Units</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Current</th>
                <th className="text-right">Returns</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} data-testid={`holding-row-${h.fund_id}`}>
                  <td>
                    <Link to={`/funds/${h.fund_id}`} className="font-medium hover:underline" style={{ color: "var(--text-primary)" }}>
                      {h.fund_name}
                    </Link>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{h.amc}</div>
                  </td>
                  <td><span className="tag tag-clay">{h.category}</span></td>
                  <td className="text-right font-mono text-xs">{fmtNum(h.units, 2)}</td>
                  <td className="text-right font-mono">{fmtINR(h.invested)}</td>
                  <td className="text-right font-mono">{fmtINR(h.current_value)}</td>
                  <td className={`text-right font-mono ${h.pnl >= 0 ? "positive" : "negative"}`}>
                    {fmtINR(h.pnl)}
                    <div className="text-[11px]">{fmtPct(h.pnl_pct)}</div>
                  </td>
                </tr>
              ))}
              {holdings.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  No holdings yet. <Link to="/funds" style={{ color: "var(--brand)" }} className="font-medium">Start investing →</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="surface p-6">
          <div className="overline mb-1">Latest</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {txns.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium truncate max-w-[260px]">{t.fund_name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="tag mr-2">{t.type}</span>
                    {t.date}
                  </div>
                </div>
                <div className="text-right font-mono text-sm">{fmtINR(t.amount)}</div>
              </div>
            ))}
            {txns.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions yet.</div>}
          </div>
        </div>

        <div className="surface p-6">
          <div className="overline mb-1">Auto-invest</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Active SIPs</h2>
          <div className="space-y-3">
            {activeSips.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium truncate max-w-[240px]">{s.fund_name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.frequency} · next {s.next_date}
                  </div>
                </div>
                <div className="text-right font-mono">{fmtINR(s.amount)}</div>
              </div>
            ))}
            {activeSips.length === 0 && (
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                No active SIPs. <Link to="/funds" style={{ color: "var(--brand)" }} className="font-medium">Start one →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, subtitle, tone, testid }) {
  const toneClass = tone === "pos" ? "positive" : tone === "neg" ? "negative" : "";
  return (
    <div className="kpi-tile" data-testid={testid}>
      <div className="flex items-start justify-between mb-6">
        <div className="overline">{label}</div>
        <Icon size={18} style={{ color: "var(--text-muted)" }} />
      </div>
      <div className={`font-display text-3xl font-bold tracking-tight ${toneClass}`}>{value}</div>
      {subtitle && <div className={`text-xs mt-1 ${toneClass}`}>{subtitle}</div>}
    </div>
  );
}
