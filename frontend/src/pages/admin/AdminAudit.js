import { useEffect, useState } from "react";
import api from "../../lib/api";
import { ScrollText, UserX, UserCheck, ShieldCheck, Megaphone, Plus, Pencil, Trash2 } from "lucide-react";

const ACTION_META = {
  "user.suspended": { Icon: UserX, color: "var(--negative)", label: "Suspended investor" },
  "user.active": { Icon: UserCheck, color: "var(--positive)", label: "Reactivated investor" },
  "kyc.approve": { Icon: ShieldCheck, color: "var(--brand)", label: "Approved KYC" },
  "fund.create": { Icon: Plus, color: "var(--positive)", label: "Created fund" },
  "fund.update": { Icon: Pencil, color: "var(--brand)", label: "Updated fund" },
  "fund.delete": { Icon: Trash2, color: "var(--negative)", label: "Deleted fund" },
  "broadcast.send": { Icon: Megaphone, color: "var(--accent-gold)", label: "Sent broadcast" },
};

export default function AdminAudit() {
  const [entries, setEntries] = useState([]);

  useEffect(() => { api.get("/admin/audit").then((r) => setEntries(r.data)); }, []);

  return (
    <div className="space-y-6 animate-in" data-testid="admin-audit-page">
      <div>
        <div className="overline mb-2">Compliance</div>
        <h1 className="font-display text-4xl font-bold tracking-tight leading-none">Audit Log</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Every admin action — who did what, when. Immutable, timestamped, last 200 events.
        </p>
      </div>

      <div className="surface overflow-hidden">
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <div className="overline">No audit events yet</div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Admin actions will appear here.</p>
          </div>
        ) : (
          <div>
            {entries.map((e) => {
              const meta = ACTION_META[e.action] || { Icon: ScrollText, color: "var(--text-muted)", label: e.action };
              const Icon = meta.Icon;
              return (
                <div key={e.id} className="flex items-start gap-4 p-4 hover:bg-[var(--bg-elevated)] transition" style={{ borderBottom: "1px solid var(--border-soft)" }} data-testid={`audit-${e.id}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--brand-soft)" }}>
                    <Icon size={16} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-display font-semibold tracking-tight text-sm">
                          {meta.label}
                          {e.target_name && <span style={{ color: "var(--text-secondary)" }}> · {e.target_name}</span>}
                        </div>
                        <div className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
                          by {e.actor_email}
                          {e.target_email && <> · target: {e.target_email}</>}
                          {!e.target_email && e.target && <> · target: {e.target}</>}
                        </div>
                        {e.details && Object.keys(e.details).length > 0 && (
                          <div className="text-xs mt-1.5 flex flex-wrap gap-2">
                            {Object.entries(e.details).map(([k, v]) => (
                              <span key={k} className="tag" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-mono shrink-0" style={{ color: "var(--text-muted)" }}>
                        {new Date(e.created_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
