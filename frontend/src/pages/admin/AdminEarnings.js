import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { fmtINR, fmtPct, fmtNum } from "../../utils/format";
import {
  IndianRupee, TrendingUp, Wallet, Percent, Briefcase,
  Pencil, Save, X, Search, Crown,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

export default function AdminEarnings() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [funds, setFunds] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [rateForm, setRateForm] = useState({ upfront_pct: 0, trail_pct: 0 });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("funds"); // funds | investors

  const load = async () => {
    const [s, f, i] = await Promise.all([
      api.get("/admin/commission/summary"),
      api.get("/admin/commission/funds"),
      api.get("/admin/commission/investors"),
    ]);
    setSummary(s.data);
    setFunds(f.data);
    setInvestors(i.data);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (row) => {
    setEditingId(row.fund_id);
    setRateForm({ upfront_pct: row.upfront_pct, trail_pct: row.trail_pct });
  };
  const cancelEdit = () => { setEditingId(null); };

  const saveRates = async (fundId) => {
    try {
      await api.patch(`/admin/funds/${fundId}/commission`, {
        upfront_pct: Number(rateForm.upfront_pct),
        trail_pct: Number(rateForm.trail_pct),
      });
      toast.success("Commission rates updated");
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const filteredFunds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return funds;
    return funds.filter(
      (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q)
    );
  }, [funds, search]);

  if (!summary) return <div className="overline">Loading earnings…</div>;

  const t = summary.totals;
  const upfrontShare = t.lifetime_earned > 0 ? (t.lifetime_upfront / t.lifetime_earned) * 100 : 0;
  const trailShare = 100 - upfrontShare;

  return (
    <div className="space-y-8 animate-in" data-testid="admin-earnings">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="overline mb-2">Portfolio Manager</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">
            Commission & Earnings
          </h1>
          <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
            What you earn from advising and managing investor portfolios.
          </p>
        </div>
        <div className="surface px-5 py-3 flex items-center gap-3" data-testid="manager-card">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
            <Crown size={18} className="text-[#0f2a5c]" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold leading-tight">{user?.name || "Portfolio Manager"}</div>
            <div className="overline mt-0.5">Distributor · ARN-Linked</div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border-soft)" }}>
        <KPI icon={IndianRupee} label="Lifetime Earnings" value={fmtINR(t.lifetime_earned, { compact: true })}
             sub={`${fmtINR(t.lifetime_upfront, { compact: true })} upfront · ${fmtINR(t.lifetime_trail, { compact: true })} trail`}
             tone="pos" testid="earn-kpi-lifetime" />
        <KPI icon={Wallet} label="This Month" value={fmtINR(t.mtd_earned, { compact: true })}
             sub="Run-rate based estimate" testid="earn-kpi-mtd" />
        <KPI icon={TrendingUp} label="Year to Date" value={fmtINR(t.ytd_earned, { compact: true })}
             sub={`${fmtINR(t.annual_runrate, { compact: true })}/yr run-rate`} testid="earn-kpi-ytd" />
        <KPI icon={Briefcase} label="AUM Managed" value={fmtINR(t.aum, { compact: true })}
             sub={`${funds.length} funds`} testid="earn-kpi-aum" />
      </div>

      {/* Mix bar */}
      <div className="surface p-6" data-testid="earn-mix">
        <div className="overline mb-1">Revenue Mix</div>
        <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Upfront vs Trail (lifetime)</h2>
        <div className="h-3 w-full rounded-full overflow-hidden flex" style={{ background: "var(--border-soft)" }}>
          <div className="h-full" style={{ width: `${upfrontShare}%`, background: "#0F2A5C" }} title="Upfront" />
          <div className="h-full" style={{ width: `${trailShare}%`, background: "#C9A95C" }} title="Trail" />
        </div>
        <div className="flex flex-wrap gap-6 mt-4 text-sm">
          <Legend2 color="#0F2A5C" label="Upfront" value={`${fmtINR(t.lifetime_upfront, { compact: true })} · ${fmtPct(upfrontShare).replace("+", "")}`} />
          <Legend2 color="#C9A95C" label="Trail" value={`${fmtINR(t.lifetime_trail, { compact: true })} · ${fmtPct(trailShare).replace("+", "")}`} />
          <Legend2 color="#7DA6E7" label="Monthly run-rate" value={fmtINR(t.monthly_runrate, { compact: true })} />
        </div>
      </div>

      {/* Trend chart */}
      <div className="surface p-6">
        <div className="overline mb-1">Trend</div>
        <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Monthly Earnings · last 12 months</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={summary.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF3" vertical={false} />
              <XAxis dataKey="month" stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                     tickFormatter={(v) => fmtINR(v, { compact: true })} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E6ECF3", borderRadius: 6, fontSize: 12 }}
                       formatter={(v) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="upfront" stackId="a" fill="#0F2A5C" name="Upfront" radius={[0, 0, 0, 0]} />
              <Bar dataKey="trail" stackId="a" fill="#C9A95C" name="Trail" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top funds quick view */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="surface p-6">
          <div className="overline mb-1">Best Performers</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Top Earning Funds</h2>
          <div className="space-y-3">
            {summary.top_funds.map((f, i) => (
              <div key={f.fund_id} className="flex items-center justify-between text-sm" data-testid={`top-earn-${f.fund_id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs w-6 shrink-0" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{f.name}</div>
                    <div className="overline mt-0.5">{f.category} · AUM {fmtINR(f.aum, { compact: true })}</div>
                  </div>
                </div>
                <span className="tag tag-gold shrink-0 ml-2 font-mono">{fmtINR(f.total_earned, { compact: true })}</span>
              </div>
            ))}
            {summary.top_funds.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>No earnings yet</div>}
          </div>
        </div>

        <div className="surface p-6">
          <div className="overline mb-1">How it works</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-3">Commission Structure</h2>
          <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            <li className="flex gap-3">
              <Percent size={14} className="mt-1 shrink-0" style={{ color: "var(--accent-gold)" }} />
              <span><strong>Upfront</strong>: earned once on every fresh investment (lumpsum + each SIP installment).</span>
            </li>
            <li className="flex gap-3">
              <Percent size={14} className="mt-1 shrink-0" style={{ color: "var(--accent-gold)" }} />
              <span><strong>Trail</strong>: paid annually on AUM, accrued as long as the investor stays invested.</span>
            </li>
            <li className="flex gap-3">
              <Percent size={14} className="mt-1 shrink-0" style={{ color: "var(--accent-gold)" }} />
              <span>Edit the per-fund % below — defaults follow Indian distributor norms by category.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs: funds / investors */}
      <div className="surface overflow-hidden" data-testid="earn-breakdown">
        <div className="px-6 pt-5 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="overline mb-1">Breakdown</div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {tab === "funds" ? "Per-Fund Earnings" : "Per-Investor Earnings"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("funds")}
              className={tab === "funds" ? "btn-brand" : "btn-ghost"}
              data-testid="tab-funds-btn">
              Funds
            </button>
            <button
              onClick={() => setTab("investors")}
              className={tab === "investors" ? "btn-brand" : "btn-ghost"}
              data-testid="tab-investors-btn">
              Investors
            </button>
          </div>
        </div>

        {tab === "funds" && (
          <>
            <div className="px-6 pb-3">
              <div className="relative max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by fund, AMC or category…"
                  className="input-flat pl-9"
                  data-testid="earn-search-input"
                />
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th className="text-right">Upfront %</th>
                  <th className="text-right">Trail %</th>
                  <th className="text-right">AUM</th>
                  <th className="text-right">Upfront ₹</th>
                  <th className="text-right">Trail ₹</th>
                  <th className="text-right">Total ₹</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFunds.map((f) => {
                  const isEdit = editingId === f.fund_id;
                  return (
                    <tr key={f.fund_id} data-testid={`earn-row-${f.fund_id}`}>
                      <td className="min-w-[260px]">
                        <div className="font-medium truncate">{f.name}</div>
                        <div className="overline mt-0.5">{f.category} · {f.investors} investor(s) · {f.txn_count} txn</div>
                      </td>
                      <td className="text-right font-mono">
                        {isEdit ? (
                          <input
                            type="number" step="0.05" min="0" max="5"
                            value={rateForm.upfront_pct}
                            onChange={(e) => setRateForm({ ...rateForm, upfront_pct: e.target.value })}
                            className="input-flat w-20 text-right"
                            data-testid={`edit-upfront-${f.fund_id}`}
                          />
                        ) : `${f.upfront_pct.toFixed(2)}%`}
                      </td>
                      <td className="text-right font-mono">
                        {isEdit ? (
                          <input
                            type="number" step="0.05" min="0" max="5"
                            value={rateForm.trail_pct}
                            onChange={(e) => setRateForm({ ...rateForm, trail_pct: e.target.value })}
                            className="input-flat w-20 text-right"
                            data-testid={`edit-trail-${f.fund_id}`}
                          />
                        ) : `${f.trail_pct.toFixed(2)}%`}
                      </td>
                      <td className="text-right font-mono">{fmtINR(f.aum, { compact: true })}</td>
                      <td className="text-right font-mono">{fmtINR(f.upfront_earned, { compact: true })}</td>
                      <td className="text-right font-mono">{fmtINR(f.trail_earned, { compact: true })}</td>
                      <td className="text-right font-mono positive font-semibold">{fmtINR(f.total_earned, { compact: true })}</td>
                      <td className="text-right">
                        {isEdit ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => saveRates(f.fund_id)} className="btn-brand !px-2 !py-1" data-testid={`save-rate-${f.fund_id}`}>
                              <Save size={12} />
                            </button>
                            <button onClick={cancelEdit} className="btn-ghost !px-2 !py-1" data-testid={`cancel-rate-${f.fund_id}`}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(f)} className="btn-ghost !px-2 !py-1" data-testid={`edit-rate-${f.fund_id}`}>
                            <Pencil size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredFunds.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No funds match your search</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {tab === "investors" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Investor</th>
                <th className="text-right">Invested</th>
                <th className="text-right">AUM</th>
                <th className="text-right">Upfront</th>
                <th className="text-right">Trail (1y)</th>
                <th className="text-right">Annual Run-rate</th>
                <th className="text-right">Total Earned</th>
              </tr>
            </thead>
            <tbody>
              {investors.map((u) => (
                <tr key={u.user_id} data-testid={`earn-inv-${u.user_id}`}>
                  <td>
                    <div className="font-medium">{u.name}</div>
                    <div className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</div>
                  </td>
                  <td className="text-right font-mono">{fmtINR(u.invested, { compact: true })}</td>
                  <td className="text-right font-mono">{fmtINR(u.aum, { compact: true })}</td>
                  <td className="text-right font-mono">{fmtINR(u.upfront_earned, { compact: true })}</td>
                  <td className="text-right font-mono">{fmtINR(u.trail_earned, { compact: true })}</td>
                  <td className="text-right font-mono">{fmtINR(u.annual_trail, { compact: true })}</td>
                  <td className="text-right font-mono positive font-semibold">{fmtINR(u.total_earned, { compact: true })}</td>
                </tr>
              ))}
              {investors.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No investors yet</td></tr>
              )}
            </tbody>
          </table>
        )}
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

function Legend2({ color, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
