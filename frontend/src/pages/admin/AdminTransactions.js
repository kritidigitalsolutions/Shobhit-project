import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { fmtINR, fmtNum } from "../../utils/format";

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);

  useEffect(() => { api.get("/admin/transactions").then((r) => setTxns(r.data)); }, []);

  const total = txns.reduce((a, t) => a + (t.amount || 0), 0);

  return (
    <div className="space-y-6 animate-in" data-testid="admin-txns-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Ledger</div>
          <h1 className="font-display text-4xl font-bold tracking-tight leading-none">All Transactions</h1>
          <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
            {txns.length} transactions · Total volume {fmtINR(total)}
          </p>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Investor</th>
              <th>Fund</th>
              <th>Type</th>
              <th className="text-right">Amount</th>
              <th className="text-right">NAV</th>
              <th className="text-right">Units</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} data-testid={`admin-txn-${t.id}`}>
                <td className="font-mono text-xs">{t.date}</td>
                <td>
                  <Link to={`/admin/users/${t.user_id}`} className="font-medium text-sm hover:underline">{t.user_name}</Link>
                  <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{t.user_email}</div>
                </td>
                <td className="text-sm truncate max-w-[240px]">{t.fund_name}</td>
                <td><span className={`tag ${t.type === "SIP" ? "tag-gold" : "tag-sky"}`}>{t.type}</span></td>
                <td className="text-right font-mono">{fmtINR(t.amount)}</td>
                <td className="text-right font-mono text-xs">₹{t.nav}</td>
                <td className="text-right font-mono text-xs">{fmtNum(t.units, 4)}</td>
              </tr>
            ))}
            {txns.length === 0 && <tr><td colSpan={7} className="text-center py-10" style={{ color: "var(--text-muted)" }}>No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
