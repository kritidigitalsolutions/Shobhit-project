import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { fmtINR } from "../../utils/format";
import { Search, UserX, UserCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  const load = () => api.get("/admin/users", { params: { q: q || undefined } }).then((r) => setUsers(r.data));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggle = async (u) => {
    const next = u.status === "suspended" ? "active" : "suspended";
    try {
      await api.patch(`/admin/users/${u.id}/status`, { status: next });
      toast.success(`User ${next}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 animate-in" data-testid="admin-users-page">
      <div>
        <div className="overline mb-2">Manage</div>
        <h1 className="font-display text-4xl font-bold tracking-tight leading-none">Investors</h1>
      </div>

      <div className="surface p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="input-flat pl-9" data-testid="admin-users-search" />
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Investor</th>
              <th>Status</th>
              <th className="text-right">Invested</th>
              <th className="text-right">Current</th>
              <th className="text-right">Holdings</th>
              <th className="text-right">SIPs</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`admin-user-row-${u.id}`}>
                <td>
                  <Link to={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                  <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{u.email}</div>
                </td>
                <td><span className={`tag ${u.status === "suspended" ? "tag-coral" : "tag-mint"}`}>{u.status || "active"}</span></td>
                <td className="text-right font-mono">{fmtINR(u.invested)}</td>
                <td className="text-right font-mono">{fmtINR(u.current_value)}</td>
                <td className="text-right font-mono">{u.holdings_count}</td>
                <td className="text-right font-mono">{u.active_sips}</td>
                <td className="text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => toggle(u)}
                      className="btn-ghost text-xs"
                      style={{ padding: "0.35rem 0.7rem", color: u.status === "suspended" ? "var(--positive)" : "var(--negative)" }}
                      data-testid={`toggle-status-${u.id}`}
                    >
                      {u.status === "suspended" ? <><UserCheck size={13} /> Activate</> : <><UserX size={13} /> Suspend</>}
                    </button>
                    <Link to={`/admin/users/${u.id}`} className="btn-ghost text-xs" style={{ padding: "0.35rem 0.55rem" }} data-testid={`view-user-${u.id}`}>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="text-center py-10" style={{ color: "var(--text-muted)" }}>No investors found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
