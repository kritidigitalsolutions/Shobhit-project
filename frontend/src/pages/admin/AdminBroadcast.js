import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Megaphone, Send, Bell, Calendar, Receipt, Shield, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const ICONS = [
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "calendar", label: "Calendar", Icon: Calendar },
  { id: "shield", label: "Shield", Icon: Shield },
  { id: "trending", label: "Trending", Icon: TrendingUp },
  { id: "receipt", label: "Tax", Icon: Receipt },
];

export default function AdminBroadcast() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    title: params.get("title") || "",
    body: params.get("body") || "",
    icon: "sparkles",
    user_id: "",
  });
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [scope, setScope] = useState("all"); // all | one

  useEffect(() => { api.get("/admin/users").then((r) => setUsers(r.data)); }, []);

  const send = async () => {
    if (!form.title || !form.body) { toast.error("Title and body are required"); return; }
    setSending(true);
    try {
      const payload = { title: form.title, body: form.body, icon: form.icon };
      if (scope === "one") payload.user_id = form.user_id;
      const { data } = await api.post("/admin/notifications/broadcast", payload);
      toast.success(`Sent to ${data.sent} investor${data.sent === 1 ? "" : "s"}`);
      setForm({ title: "", body: "", icon: "sparkles", user_id: "" });
    } catch (e) { toast.error(formatApiError(e)); }
    setSending(false);
  };

  const SelectedIcon = ICONS.find((i) => i.id === form.icon)?.Icon || Sparkles;

  return (
    <div className="space-y-6 animate-in" data-testid="admin-broadcast-page">
      <div>
        <div className="overline mb-2">Engage</div>
        <h1 className="font-display text-4xl font-bold tracking-tight leading-none">Broadcast Notification</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Push a notification to all investors or a single user.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="surface p-6 space-y-4">
          <div>
            <label className="overline block mb-2">Audience</label>
            <div className="flex gap-2">
              <button onClick={() => setScope("all")} className="text-sm px-4 py-2 rounded-md font-medium" style={{ background: scope === "all" ? "var(--brand)" : "transparent", color: scope === "all" ? "white" : "var(--text-secondary)", border: "1px solid " + (scope === "all" ? "var(--brand)" : "var(--border-soft)") }} data-testid="scope-all-btn">
                All investors ({users.length})
              </button>
              <button onClick={() => setScope("one")} className="text-sm px-4 py-2 rounded-md font-medium" style={{ background: scope === "one" ? "var(--brand)" : "transparent", color: scope === "one" ? "white" : "var(--text-secondary)", border: "1px solid " + (scope === "one" ? "var(--brand)" : "var(--border-soft)") }} data-testid="scope-one-btn">
                Single user
              </button>
            </div>
          </div>

          {scope === "one" && (
            <div>
              <label className="overline block mb-2">User</label>
              <select className="input-flat" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} data-testid="user-select">
                <option value="">— Pick an investor —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="overline block mb-2">Title</label>
            <input className="input-flat" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="NAV alert — Quant Active Fund" data-testid="broadcast-title-input" />
          </div>

          <div>
            <label className="overline block mb-2">Message</label>
            <textarea className="input-flat" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Quant Active is up +3.2% today. Tap to check your allocation." data-testid="broadcast-body-input" />
          </div>

          <div>
            <label className="overline block mb-2">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setForm({ ...form, icon: id })}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border"
                  style={{
                    background: form.icon === id ? "var(--brand)" : "transparent",
                    color: form.icon === id ? "white" : "var(--text-secondary)",
                    borderColor: form.icon === id ? "var(--brand)" : "var(--border-soft)",
                  }}
                  data-testid={`icon-${id}`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={send} disabled={sending || !form.title || !form.body || (scope === "one" && !form.user_id)} className="btn-brand w-full justify-center mt-2" data-testid="broadcast-send-btn">
            {sending ? <>Sending…</> : <><Send size={15} /> Send {scope === "all" ? `to ${users.length} investors` : "to user"}</>}
          </button>
        </div>

        {/* Preview */}
        <div className="surface p-6">
          <div className="overline mb-1">Preview</div>
          <h2 className="font-display text-lg font-semibold tracking-tight mb-4">How investors will see it</h2>

          <div className="surface-flat p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--brand-soft)" }}>
                <SelectedIcon size={18} style={{ color: "var(--brand)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display font-semibold tracking-tight text-sm">{form.title || "Notification title"}</div>
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent-gold)" }} />
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{form.body || "Your message body will appear here."}</p>
                <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>Just now</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <Bell size={13} />
            Appears in the investor's Notifications inbox immediately.
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <Megaphone size={13} />
            Sender: <span className="font-mono">admin@shobhitcapital.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
