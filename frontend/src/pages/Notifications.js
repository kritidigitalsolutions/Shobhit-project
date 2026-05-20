import { useEffect, useState } from "react";
import api from "../lib/api";
import { Bell, Calendar, Shield, TrendingUp, Receipt, Sparkles, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const ICONS = { calendar: Calendar, shield: Shield, trending: TrendingUp, receipt: Receipt, sparkles: Sparkles };

export default function Notifications() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/notifications").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };
  const markAll = async () => {
    await api.post("/notifications/read-all");
    toast.success("All notifications marked read");
    load();
  };

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-6 animate-in" data-testid="notifications-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Inbox</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Notifications</h1>
          <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
            {unread > 0 ? `${unread} unread updates` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="btn-ghost" data-testid="mark-all-read-btn">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="surface overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <div className="overline">No notifications</div>
          </div>
        ) : (
          <div>
            {items.map((n) => {
              const Icon = ICONS[n.icon] || Bell;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-[var(--bg-elevated)] transition"
                  style={{ borderBottom: "1px solid var(--border-soft)", background: n.read ? "transparent" : "rgba(15,42,92,0.02)" }}
                  data-testid={`notif-${n.id}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: n.read ? "var(--bg-elevated)" : "var(--brand-soft)" }}>
                    <Icon size={18} style={{ color: n.read ? "var(--text-muted)" : "var(--brand)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-display font-semibold tracking-tight text-sm">{n.title}</div>
                      {!n.read && <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent-gold)" }} />}
                    </div>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{n.body}</p>
                    <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                      {new Date(n.created_at).toLocaleString("en-IN")}
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
