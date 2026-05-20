import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { fmtINR } from "../../utils/format";
import { Users, Briefcase, Activity, IndianRupee, TrendingUp, ShieldAlert, Wallet, ArrowRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import RiskHeatmap from "../../components/RiskHeatmap";

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [earn, setEarn] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setData(r.data));
    api.get("/admin/commission/summary").then((r) => setEarn(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="overline">Loading admin metrics…</div>;
  const { totals, recent_signups, top_funds, growth } = data;

  return (
    <div className="space-y-8 animate-in" data-testid="admin-overview">
      <div>
        <div className="overline mb-2">Console</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Platform Overview</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Aggregate metrics across all investors.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border-soft)" }}>
        <KPI icon={Users} label="Investors" value={totals.investors} sub={`${totals.suspended} suspended`} testid="admin-kpi-investors" />
        <KPI icon={IndianRupee} label="AUM" value={fmtINR(totals.aum, { compact: true })} testid="admin-kpi-aum" />
        <KPI icon={TrendingUp} label="Platform P&L" value={fmtINR(totals.platform_pnl, { compact: true })} tone={totals.platform_pnl >= 0 ? "pos" : "neg"} testid="admin-kpi-pnl" />
        <KPI icon={Activity} label="Active SIPs" value={totals.active_sips} testid="admin-kpi-sips" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border-soft)" }}>
        <KPI icon={Briefcase} label="Funds Listed" value={totals.funds} testid="admin-kpi-funds" />
        <KPI icon={Activity} label="Transactions" value={totals.transactions} testid="admin-kpi-txns" />
        <KPI icon={IndianRupee} label="Total Invested" value={fmtINR(totals.invested, { compact: true })} testid="admin-kpi-invested" />
        <KPI icon={ShieldAlert} label="Suspended" value={totals.suspended} tone={totals.suspended ? "neg" : ""} testid="admin-kpi-suspended" />
      </div>

      <RiskHeatmap />

      {earn && (
        <Link
          to="/admin/earnings"
          className="surface px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 group hover:border-[var(--brand)] transition-colors"
          data-testid="admin-earnings-banner"
          style={{ borderLeft: "3px solid var(--accent-gold)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
              <Wallet size={20} className="text-[#0f2a5c]" />
            </div>
            <div>
              <div className="overline">Portfolio Manager Income</div>
              <div className="font-display text-2xl font-bold tracking-tight mt-1">
                {fmtINR(earn.totals.lifetime_earned, { compact: true })}
                <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                  lifetime · {fmtINR(earn.totals.mtd_earned, { compact: true })} this month
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Metric label="Run-rate / yr" value={fmtINR(earn.totals.annual_runrate, { compact: true })} />
            <Metric label="AUM Managed" value={fmtINR(earn.totals.aum, { compact: true })} />
            <ArrowRight size={18} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="surface p-6 lg:col-span-2">
          <div className="overline mb-1">Growth</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Investors over time</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF3" vertical={false} />
                <XAxis dataKey="month" stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E6ECF3", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="users" fill="#0F2A5C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-6">
          <div className="overline mb-1">Most popular</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Top Funds</h2>
          <div className="space-y-3">
            {top_funds.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>No data yet</div>}
            {top_funds.map((f, i) => (
              <div key={f.fund_id} className="flex items-center justify-between text-sm" data-testid={`top-fund-${f.fund_id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs w-6 shrink-0" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                  <span className="truncate">{f.name}</span>
                </div>
                <span className="tag tag-gold shrink-0 ml-2">{f.investors}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <div className="overline mb-1">Latest</div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Recent Signups</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {recent_signups.map((u) => (
              <tr key={u.id} data-testid={`signup-${u.id}`}>
                <td className="font-medium">{u.name}</td>
                <td className="font-mono text-xs">{u.email}</td>
                <td><span className={`tag ${u.status === "suspended" ? "tag-coral" : "tag-mint"}`}>{u.status || "active"}</span></td>
                <td className="font-mono text-xs">{(u.created_at || "").slice(0, 10)}</td>
              </tr>
            ))}
            {recent_signups.length === 0 && <tr><td colSpan={4} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No signups yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, tone, testid }) {
  const t = tone === "pos" ? "positive" : tone === "neg" ? "negative" : "";
  return (
    <div className="kpi-tile" data-testid={testid}>
      <div className="flex items-center justify-between mb-3">
        <div className="overline">{label}</div>
        <Icon size={16} style={{ color: "var(--text-muted)" }} />
      </div>
      <div className={`font-display text-2xl font-bold tracking-tight ${t}`}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="text-right">
      <div className="overline">{label}</div>
      <div className="font-mono font-semibold mt-0.5">{value}</div>
    </div>
  );
}
