import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { fmtINR, fmtNum } from "../../utils/format";
import { ArrowLeft, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  const load = () => api.get(`/admin/users/${id}`).then((r) => setData(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!data) return <div className="overline">Loading…</div>;
  const { user, holdings, sips, transactions, kyc } = data;

  const toggle = async () => {
    const next = user.status === "suspended" ? "active" : "suspended";
    try {
      await api.patch(`/admin/users/${id}/status`, { status: next });
      toast.success(`User ${next}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const approveKyc = async () => {
    try {
      await api.post(`/admin/kyc/${id}/approve`);
      toast.success("KYC approved");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 animate-in" data-testid="admin-user-detail">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft size={14} /> Back to investors
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Investor</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-none">{user.name}</h1>
          <div className="text-sm font-mono mt-2" style={{ color: "var(--text-secondary)" }}>{user.email}</div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`tag ${user.status === "suspended" ? "tag-coral" : "tag-mint"}`}>{user.status || "active"}</span>
            <span className="tag">{user.role}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Joined {(user.created_at || "").slice(0, 10)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {kyc && kyc.status !== "Completed" && (
            <button onClick={approveKyc} className="btn-gold" data-testid="approve-kyc-btn">
              <ShieldCheck size={15} /> Approve KYC
            </button>
          )}
          <button onClick={toggle} className="btn-ghost" data-testid="toggle-suspend-btn" style={{ color: user.status === "suspended" ? "var(--positive)" : "var(--negative)" }}>
            {user.status === "suspended" ? <><UserCheck size={15} /> Activate</> : <><UserX size={15} /> Suspend</>}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="surface overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <div className="overline mb-1">Portfolio</div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Holdings ({holdings.length})</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Fund</th><th className="text-right">Invested</th><th className="text-right">Current</th><th className="text-right">P&L</th></tr></thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id}>
                  <td className="font-medium text-sm truncate max-w-[220px]">{h.fund_name}</td>
                  <td className="text-right font-mono text-xs">{fmtINR(h.invested)}</td>
                  <td className="text-right font-mono text-xs">{fmtINR(h.current_value)}</td>
                  <td className={`text-right font-mono text-xs ${h.pnl >= 0 ? "positive" : "negative"}`}>{fmtINR(h.pnl)}</td>
                </tr>
              ))}
              {holdings.length === 0 && <tr><td colSpan={4} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No holdings</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="surface overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <div className="overline mb-1">Auto-invest</div>
            <h2 className="font-display text-lg font-semibold tracking-tight">SIPs ({sips.length})</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Fund</th><th className="text-right">Amount</th><th>Status</th><th>Next</th></tr></thead>
            <tbody>
              {sips.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-sm truncate max-w-[200px]">{s.fund_name}</td>
                  <td className="text-right font-mono text-xs">{fmtINR(s.amount)}</td>
                  <td><span className={`tag ${s.status === "active" ? "tag-mint" : "tag-coral"}`}>{s.status}</span></td>
                  <td className="font-mono text-xs">{s.next_date}</td>
                </tr>
              ))}
              {sips.length === 0 && <tr><td colSpan={4} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No SIPs</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <div className="overline mb-1">Activity</div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Last 20 Transactions</h2>
        </div>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Fund</th><th>Type</th><th className="text-right">Amount</th><th className="text-right">Units</th></tr></thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="font-mono text-xs">{t.date}</td>
                <td className="font-medium text-sm truncate max-w-[260px]">{t.fund_name}</td>
                <td><span className={`tag ${t.type === "SIP" ? "tag-gold" : "tag-sky"}`}>{t.type}</span></td>
                <td className="text-right font-mono text-xs">{fmtINR(t.amount)}</td>
                <td className="text-right font-mono text-xs">{fmtNum(t.units, 4)}</td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td colSpan={5} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No transactions</td></tr>}
          </tbody>
        </table>
      </div>

      {kyc && (
        <div className="surface p-6">
          <div className="overline mb-1">Compliance</div>
          <h2 className="font-display text-lg font-semibold tracking-tight mb-4">KYC Details</h2>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Row label="PAN" v={kyc.pan} ok={kyc.pan_verified} />
            <Row label="Aadhaar" v={kyc.aadhaar} ok={kyc.aadhaar_verified} />
            <Row label="Bank A/c" v={kyc.bank_account} ok={kyc.bank_verified} />
            <Row label="IFSC" v={kyc.ifsc} ok={!!kyc.ifsc} />
            <Row label="Address" v={kyc.address} ok={kyc.address_verified} />
            <Row label="Status" v={kyc.status} ok={kyc.status === "Completed"} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, v, ok }) {
  return (
    <div className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "0.5rem" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-mono text-xs flex items-center gap-2">
        {v || "—"}
        {ok != null && <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "var(--positive)" : "var(--text-muted)" }} />}
      </span>
    </div>
  );
}
