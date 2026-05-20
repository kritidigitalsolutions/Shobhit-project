import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { ShieldCheck, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

export default function AdminKYC() {
  const [kycs, setKycs] = useState([]);

  const load = () => api.get("/admin/kyc").then((r) => setKycs(r.data));
  useEffect(() => { load(); }, []);

  const approve = async (uid) => {
    try {
      await api.post(`/admin/kyc/${uid}/approve`);
      toast.success("KYC approved");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const pending = kycs.filter((k) => k.status !== "Completed");
  const done = kycs.filter((k) => k.status === "Completed");

  return (
    <div className="space-y-6 animate-in" data-testid="admin-kyc-page">
      <div>
        <div className="overline mb-2">Compliance</div>
        <h1 className="font-display text-4xl font-bold tracking-tight leading-none">KYC Queue</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          {pending.length} pending · {done.length} completed
        </p>
      </div>

      <Section title="Pending Review" items={pending} onApprove={approve} testidPrefix="pending" emptyMsg="Nothing pending. All caught up." />
      <Section title="Completed" items={done} testidPrefix="done" emptyMsg="No completed KYCs yet." />
    </div>
  );
}

function Section({ title, items, onApprove, testidPrefix, emptyMsg }) {
  return (
    <div className="surface overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <span className="tag">{items.length}</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Investor</th>
            <th>PAN</th>
            <th>Aadhaar</th>
            <th>Bank</th>
            <th>Address</th>
            <th>Status</th>
            {onApprove && <th className="text-right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((k) => (
            <tr key={k.user_id} data-testid={`kyc-${testidPrefix}-${k.user_id}`}>
              <td>
                <Link to={`/admin/users/${k.user_id}`} className="font-medium hover:underline">{k.user_name}</Link>
                <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{k.user_email}</div>
              </td>
              <Check ok={k.pan_verified} v={k.pan} />
              <Check ok={k.aadhaar_verified} v={k.aadhaar} />
              <Check ok={k.bank_verified} v={k.bank_account} />
              <Check ok={k.address_verified} v={k.address} />
              <td><span className={`tag ${k.status === "Completed" ? "tag-mint" : "tag-gold"}`}>{k.status}</span></td>
              {onApprove && (
                <td className="text-right">
                  <button onClick={() => onApprove(k.user_id)} className="btn-gold text-xs" style={{ padding: "0.4rem 0.8rem" }} data-testid={`approve-kyc-${k.user_id}`}>
                    <ShieldCheck size={13} /> Approve
                  </button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={onApprove ? 7 : 6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>{emptyMsg}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Check({ ok, v }) {
  return (
    <td className="font-mono text-xs">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 size={13} style={{ color: "var(--positive)" }} /> : <Circle size={13} style={{ color: "var(--text-muted)" }} />}
        <span style={{ color: ok ? "var(--text-primary)" : "var(--text-muted)" }}>{v || "—"}</span>
      </div>
    </td>
  );
}
