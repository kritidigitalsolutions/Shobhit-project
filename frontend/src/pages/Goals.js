import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { fmtINR } from "../utils/format";
import { Plus, Target, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const GOAL_ICONS = [
  { id: "home", label: "Home", img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&q=80&auto=format&fit=crop" },
  { id: "car", label: "Car", img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&q=80&auto=format&fit=crop" },
  { id: "education", label: "Education", img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&q=80&auto=format&fit=crop" },
  { id: "wedding", label: "Wedding", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80&auto=format&fit=crop" },
  { id: "retirement", label: "Retirement", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80&auto=format&fit=crop" },
  { id: "travel", label: "Travel", img: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&q=80&auto=format&fit=crop" },
  { id: "target", label: "Other", img: null },
];

function imgFor(icon) {
  return GOAL_ICONS.find((g) => g.id === icon)?.img;
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: 1000000, current_amount: 0, target_date: "", icon: "home" });

  const load = () => api.get("/goals").then((r) => setGoals(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.post("/goals", { ...form, target_amount: Number(form.target_amount), current_amount: Number(form.current_amount) });
      setOpen(false);
      setForm({ name: "", target_amount: 1000000, current_amount: 0, target_date: "", icon: "home" });
      load();
      toast.success("Goal created");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (id) => {
    await api.delete(`/goals/${id}`);
    load();
    toast.success("Goal removed");
  };

  const yearsLeft = (date) => {
    if (!date) return null;
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24 * 365);
    return Math.max(0, Math.round(diff));
  };

  return (
    <div className="space-y-6 animate-in" data-testid="goals-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Plan</div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-none">Goal Tracker</h1>
          <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
            Visualize each milestone — a home, a car, your child's education, retirement.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-brand" data-testid="new-goal-btn">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="surface p-10 md:p-12 text-center">
          <Target size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <div className="font-display text-lg font-semibold tracking-tight">No goals yet</div>
          <p className="text-sm mt-2 mb-5" style={{ color: "var(--text-secondary)" }}>
            Set your first goal — a home, a child's education, retirement.
          </p>
          <button onClick={() => setOpen(true)} className="btn-brand inline-flex">
            <Plus size={16} /> Add Goal
          </button>
        </div>
      ) : (
        <div className="surface p-5 md:p-6">
          <div className="relative pl-7 md:pl-10">
            {/* Timeline vertical line */}
            <div className="absolute left-3 md:left-4 top-2 bottom-2 w-px" style={{ background: "var(--border-soft)" }} />

            {goals.map((g) => {
              const yrs = yearsLeft(g.target_date);
              const img = imgFor(g.icon);
              return (
                <div key={g.id} className="relative pb-7 last:pb-0" data-testid={`goal-card-${g.id}`}>
                  {/* Timeline dot */}
                  <div className="absolute -left-[18px] md:-left-[24px] top-2 w-3 h-3 rounded-full ring-4" style={{ background: "var(--brand)", boxShadow: "0 0 0 4px var(--bg-card)" }} />

                  <div className="flex gap-4">
                    {/* Image / fallback */}
                    {img ? (
                      <img src={img} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover shrink-0" style={{ border: "1px solid var(--border-soft)" }} />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "var(--brand-soft)" }}>
                        <Target size={24} style={{ color: "var(--brand)" }} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="overline mb-1">
                            {yrs != null ? `${yrs} yr${yrs === 1 ? "" : "s"} · ` : ""}{g.target_date}
                          </div>
                          <div className="font-display text-base md:text-lg font-semibold tracking-tight truncate">{g.name}</div>
                        </div>
                        <button onClick={() => remove(g.id)} className="p-1.5 rounded hover:bg-[var(--brand-soft)] shrink-0" data-testid={`delete-goal-${g.id}`}>
                          <Trash2 size={14} style={{ color: "var(--text-muted)" }} />
                        </button>
                      </div>

                      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Target</div>
                          <div className="font-mono text-sm font-semibold">{fmtINR(g.target_amount, { compact: true })}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Achieved</div>
                          <div className="font-mono text-sm font-semibold">{fmtINR(g.current_amount, { compact: true })}</div>
                        </div>
                        <div className="ml-auto">
                          <div className="text-[10px] uppercase tracking-wide text-right" style={{ color: "var(--text-muted)" }}>{g.progress_pct}% Achieved</div>
                        </div>
                      </div>

                      <div className="h-1.5 mt-2 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                        <div className="h-full transition-all" style={{ width: `${g.progress_pct}%`, background: "linear-gradient(90deg, var(--brand) 0%, var(--accent-gold) 100%)" }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(15,42,92,0.5)" }} data-testid="new-goal-modal">
          <div className="surface max-w-md w-full p-6 animate-in md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold tracking-tight">New Goal</h3>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="overline block mb-2">Goal Type</label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_ICONS.filter((g) => g.id !== "target").map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setForm({ ...form, icon: g.id })}
                      className="text-xs px-3 py-1.5 rounded-full border transition"
                      style={{
                        background: form.icon === g.id ? "var(--brand)" : "transparent",
                        color: form.icon === g.id ? "white" : "var(--text-secondary)",
                        borderColor: form.icon === g.id ? "var(--brand)" : "var(--border-soft)",
                      }}
                      data-testid={`goal-icon-${g.id}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="overline block mb-2">Goal Name</label>
                <input className="input-flat" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Buy a Home" data-testid="goal-name-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="overline block mb-2">Target Amount</label>
                  <input type="number" className="input-flat" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} data-testid="goal-target-input" />
                </div>
                <div>
                  <label className="overline block mb-2">Already Saved</label>
                  <input type="number" className="input-flat" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} data-testid="goal-current-input" />
                </div>
              </div>
              <div>
                <label className="overline block mb-2">Target Date</label>
                <input type="date" className="input-flat" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} data-testid="goal-date-input" />
              </div>
              <button onClick={create} disabled={!form.name || !form.target_date} className="btn-brand w-full justify-center mt-2" data-testid="create-goal-btn">
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
