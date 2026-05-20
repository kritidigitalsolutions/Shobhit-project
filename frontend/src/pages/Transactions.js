import { useEffect, useState, useMemo } from "react";
import api from "../lib/api";
import { fmtINR, fmtNum } from "../utils/format";

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [type, setType] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/transactions").then((r) => setTxns(r.data)); }, []);

  const filtered = useMemo(() => txns.filter((t) => {
    if (type !== "All" && t.type !== type) return false;
    if (q && !(t.fund_name || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [txns, type, q]);

  const total = filtered.reduce((a, t) => a + (t.amount || 0), 0);

  return (
    <div className="space-y-6 animate-in" data-testid="transaction-history">
      <div>
        <div className="overline mb-2">Ledger</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Transactions</h1>
      </div>

      <div className="surface p-5">
        <div className="grid md:grid-cols-12 gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fund..." className="input-flat md:col-span-8" data-testid="txn-search" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-flat md:col-span-2" data-testid="txn-type-filter">
            <option>All</option>
            <option>SIP</option>
            <option>Lumpsum</option>
          </select>
          <div className="surface-flat px-4 md:col-span-2 flex items-center justify-between">
            <span className="overline">Total</span>
            <span className="font-mono text-sm font-semibold">{fmtINR(total)}</span>
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fund</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th className="text-right">NAV</th>
                <th className="text-right">Units</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} data-testid={`txn-row-${t.id}`}>
                  <td className="font-mono text-xs">{t.date}</td>
                  <td>
                    <div className="font-medium truncate max-w-[280px]">{t.fund_name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t.amc}</div>
                  </td>
                  <td><span className={`tag ${t.type === "SIP" ? "tag-clay" : "tag-sky"}`}>{t.type}</span></td>
                  <td className="text-right font-mono">{fmtINR(t.amount)}</td>
                  <td className="text-right font-mono text-xs">₹{t.nav}</td>
                  <td className="text-right font-mono text-xs">{fmtNum(t.units, 4)}</td>
                  <td><span className="tag">{t.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
