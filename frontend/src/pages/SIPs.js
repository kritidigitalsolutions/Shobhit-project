import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { fmtINR } from "../utils/format";
import { Play, Pause, Square, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SIPs() {
  const [sips, setSips] = useState([]);

  const load = () => api.get("/sips").then((r) => setSips(r.data));
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      await api.patch(`/sips/${id}`, null, { params: { action } });
      toast.success(`SIP ${action}d`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 animate-in" data-testid="sip-management">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Auto-invest</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Systematic Investment Plans</h1>
          <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
            Build wealth with disciplined monthly contributions.
          </p>
        </div>
        <Link to="/funds" className="btn-brand" data-testid="new-sip-btn">
          <Plus size={16} /> New SIP
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: "var(--border-soft)" }}>
        <Stat label="Active SIPs" value={sips.filter(s => s.status === "active").length} />
        <Stat label="Monthly Commit" value={fmtINR(sips.filter(s => s.status === "active").reduce((a, s) => a + s.amount, 0))} />
        <Stat label="Annual Commit" value={fmtINR(sips.filter(s => s.status === "active").reduce((a, s) => a + s.amount, 0) * 12)} />
      </div>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fund</th>
                <th>Frequency</th>
                <th className="text-right">Amount</th>
                <th>Next Date</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sips.map((s) => (
                <tr key={s.id} data-testid={`sip-row-${s.id}`}>
                  <td>
                    <Link to={`/funds/${s.fund_id}`} className="font-medium hover:underline">{s.fund_name}</Link>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.amc}</div>
                  </td>
                  <td className="capitalize">{s.frequency}</td>
                  <td className="text-right font-mono">{fmtINR(s.amount)}</td>
                  <td className="font-mono text-xs">{s.next_date}</td>
                  <td>
                    <span className={`tag ${s.status === "active" ? "" : s.status === "paused" ? "tag-clay" : "tag-terracotta"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex gap-1">
                      {s.status === "active" && (
                        <button onClick={() => act(s.id, "pause")} className="btn-ghost text-xs" style={{ padding: "0.35rem 0.7rem" }} data-testid={`pause-sip-${s.id}`}>
                          <Pause size={13} /> Pause
                        </button>
                      )}
                      {s.status === "paused" && (
                        <button onClick={() => act(s.id, "resume")} className="btn-ghost text-xs" style={{ padding: "0.35rem 0.7rem" }} data-testid={`resume-sip-${s.id}`}>
                          <Play size={13} /> Resume
                        </button>
                      )}
                      {s.status !== "stopped" && (
                        <button onClick={() => act(s.id, "stop")} className="btn-ghost text-xs" style={{ padding: "0.35rem 0.7rem", color: "var(--negative)" }} data-testid={`stop-sip-${s.id}`}>
                          <Square size={13} /> Stop
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sips.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  No SIPs yet. <Link to="/funds" style={{ color: "var(--brand)" }} className="font-medium">Start your first SIP →</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white p-6">
      <div className="overline mb-2">{label}</div>
      <div className="font-display text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
