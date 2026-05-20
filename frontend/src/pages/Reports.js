import { useEffect, useState } from "react";
import api from "../lib/api";
import { fmtINR, fmtNum, fmtPct } from "../utils/format";
import { Download, FileText, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [tab, setTab] = useState("statement");
  const [statement, setStatement] = useState(null);
  const [pnl, setPnl] = useState(null);

  useEffect(() => {
    api.get("/reports/statement").then((r) => setStatement(r.data));
    api.get("/reports/pnl").then((r) => setPnl(r.data));
  }, []);

  const download = (type) => {
    const rows = type === "statement" ? statement.rows : pnl.rows;
    if (!rows) return;
    const headers = type === "statement"
      ? ["Date", "Fund", "Type", "Amount", "NAV", "Units", "Status", "Running"]
      : ["Fund", "Category", "Units", "Avg NAV", "Current NAV", "Invested", "Current", "P&L", "P&L %", "Type"];
    const data = type === "statement"
      ? rows.map((r) => [r.date, r.fund_name, r.type, r.amount, r.nav, r.units, r.status, r.running_balance])
      : rows.map((r) => [r.fund_name, r.category, r.units, r.avg_nav, r.current_nav, r.invested, r.current_value, r.pnl, r.pnl_pct, r.holding_type]);
    const csv = [headers, ...data].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shobhit-${type}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <div className="space-y-6 animate-in" data-testid="reports-page">
      <div>
        <div className="overline mb-2">Account</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Reports & Statements</h1>
      </div>

      <div className="flex gap-2">
        <TabBtn active={tab === "statement"} onClick={() => setTab("statement")} icon={FileText} label="Account Statement" testid="tab-statement" />
        <TabBtn active={tab === "pnl"} onClick={() => setTab("pnl")} icon={BarChart3} label="P&L Statement" testid="tab-pnl" />
      </div>

      {tab === "statement" && statement && (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <div className="overline mb-1">Transaction Statement</div>
              <h2 className="font-display text-xl font-semibold tracking-tight">{statement.user.name}</h2>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Generated {new Date(statement.generated_at).toLocaleString("en-IN")} · Total invested {fmtINR(statement.total_invested)}
              </div>
            </div>
            <button onClick={() => download("statement")} className="btn-brand text-sm" data-testid="download-statement-btn">
              <Download size={14} /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Fund</th><th>Type</th><th className="text-right">Amount</th><th className="text-right">NAV</th><th className="text-right">Units</th><th className="text-right">Running</th></tr>
              </thead>
              <tbody>
                {statement.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.date}</td>
                    <td><div className="font-medium truncate max-w-[260px]">{r.fund_name}</div></td>
                    <td><span className={`tag ${r.type === "SIP" ? "tag-gold" : "tag-sky"}`}>{r.type}</span></td>
                    <td className="text-right font-mono">{fmtINR(r.amount)}</td>
                    <td className="text-right font-mono text-xs">₹{r.nav}</td>
                    <td className="text-right font-mono text-xs">{fmtNum(r.units, 4)}</td>
                    <td className="text-right font-mono font-semibold">{fmtINR(r.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pnl" && pnl && (
        <>
          <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border-soft)" }}>
            <KPI label="Invested" value={fmtINR(pnl.total_invested)} />
            <KPI label="Current" value={fmtINR(pnl.total_current)} />
            <KPI label="Total P&L" value={fmtINR(pnl.total_pnl)} tone={pnl.total_pnl >= 0 ? "pos" : "neg"} />
          </div>

          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">Holding-wise P&L</h2>
              <button onClick={() => download("pnl")} className="btn-brand text-sm" data-testid="download-pnl-btn">
                <Download size={14} /> CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Fund</th><th>Category</th><th>Type</th><th className="text-right">Invested</th><th className="text-right">Current</th><th className="text-right">P&L</th></tr>
                </thead>
                <tbody>
                  {pnl.rows.map((r) => (
                    <tr key={r.fund_id}>
                      <td><div className="font-medium truncate max-w-[240px]">{r.fund_name}</div></td>
                      <td><span className="tag">{r.category}</span></td>
                      <td><span className={`tag ${r.holding_type === "Long Term" ? "tag-mint" : "tag-coral"}`}>{r.holding_type}</span></td>
                      <td className="text-right font-mono">{fmtINR(r.invested)}</td>
                      <td className="text-right font-mono">{fmtINR(r.current_value)}</td>
                      <td className={`text-right font-mono ${r.pnl >= 0 ? "positive" : "negative"}`}>
                        {fmtINR(r.pnl)} <div className="text-[11px]">{fmtPct(r.pnl_pct)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
      style={{
        background: active ? "var(--brand)" : "transparent",
        color: active ? "white" : "var(--text-secondary)",
        border: "1px solid " + (active ? "var(--brand)" : "var(--border-soft)"),
      }}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function KPI({ label, value, tone }) {
  const t = tone === "pos" ? "positive" : tone === "neg" ? "negative" : "";
  return (
    <div className="kpi-tile">
      <div className="overline mb-2">{label}</div>
      <div className={`font-display text-2xl font-bold tracking-tight ${t}`}>{value}</div>
    </div>
  );
}
