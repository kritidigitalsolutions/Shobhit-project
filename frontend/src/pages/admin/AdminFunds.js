import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { fmtPct } from "../../utils/format";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const EMPTY = {
  id: "", name: "", amc: "", category: "Large Cap", risk: "Moderate",
  nav: 100, aum_cr: 1000, expense_ratio: 0.6, returns_1y: 12, returns_3y: 15, returns_5y: 14,
  rating: 4.0, min_sip: 500, min_lumpsum: 5000,
};
const CATEGORIES = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Large & Mid Cap", "ELSS", "Index", "Hybrid", "Debt"];
const RISKS = ["Low", "Moderate", "High"];

export default function AdminFunds() {
  const [funds, setFunds] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const load = () => api.get("/funds").then((r) => setFunds(r.data));
  useEffect(() => { load(); }, []);

  const startEdit = (f) => {
    setEditingId(f.id);
    setForm({ ...f });
    setOpen(true);
  };
  const startCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const save = async () => {
    const payload = { ...form };
    ["nav", "aum_cr", "expense_ratio", "returns_1y", "returns_3y", "returns_5y", "rating", "min_sip", "min_lumpsum"].forEach((k) => { payload[k] = Number(payload[k]); });
    try {
      if (editingId) {
        await api.put(`/admin/funds/${editingId}`, payload);
        toast.success("Fund updated");
      } else {
        await api.post("/admin/funds", payload);
        toast.success("Fund created");
      }
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this fund? Cannot be undone.")) return;
    try {
      await api.delete(`/admin/funds/${id}`);
      toast.success("Fund deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 animate-in" data-testid="admin-funds-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="overline mb-2">Manage</div>
          <h1 className="font-display text-4xl font-bold tracking-tight leading-none">Funds</h1>
        </div>
        <button onClick={startCreate} className="btn-brand" data-testid="new-fund-btn">
          <Plus size={16} /> Add Fund
        </button>
      </div>

      <div className="surface overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Category</th>
              <th className="text-right">NAV</th>
              <th className="text-right">1Y</th>
              <th className="text-right">3Y</th>
              <th className="text-right">AUM (Cr)</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((f) => (
              <tr key={f.id} data-testid={`admin-fund-row-${f.id}`}>
                <td>
                  <div className="font-medium truncate max-w-[280px]">{f.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{f.amc} · {f.id}</div>
                </td>
                <td><span className="tag">{f.category}</span></td>
                <td className="text-right font-mono">₹{f.nav.toFixed(2)}</td>
                <td className={`text-right font-mono text-xs ${f.returns_1y >= 0 ? "positive" : "negative"}`}>{fmtPct(f.returns_1y)}</td>
                <td className={`text-right font-mono text-xs ${f.returns_3y >= 0 ? "positive" : "negative"}`}>{fmtPct(f.returns_3y)}</td>
                <td className="text-right font-mono text-xs">{f.aum_cr.toLocaleString("en-IN")}</td>
                <td className="text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => startEdit(f)} className="btn-ghost text-xs" style={{ padding: "0.35rem 0.55rem" }} data-testid={`edit-fund-${f.id}`}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove(f.id)} className="btn-ghost text-xs" style={{ padding: "0.35rem 0.55rem", color: "var(--negative)" }} data-testid={`delete-fund-${f.id}`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,42,92,0.5)" }} data-testid="fund-form-modal">
          <div className="surface max-w-2xl w-full p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-semibold tracking-tight">{editingId ? "Edit Fund" : "Add New Fund"}</h3>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fund Name" full v={form.name} set={(v) => setForm({ ...form, name: v })} testid="fund-name" />
              <Field label="AMC" v={form.amc} set={(v) => setForm({ ...form, amc: v })} testid="fund-amc" />
              <Field label="Fund ID (optional)" v={form.id} set={(v) => setForm({ ...form, id: v })} placeholder="Auto" disabled={!!editingId} testid="fund-id" />
              <SelectField label="Category" v={form.category} set={(v) => setForm({ ...form, category: v })} options={CATEGORIES} testid="fund-category" />
              <SelectField label="Risk" v={form.risk} set={(v) => setForm({ ...form, risk: v })} options={RISKS} testid="fund-risk" />
              <Field label="NAV" type="number" step="0.01" v={form.nav} set={(v) => setForm({ ...form, nav: v })} testid="fund-nav" />
              <Field label="AUM (Cr)" type="number" v={form.aum_cr} set={(v) => setForm({ ...form, aum_cr: v })} testid="fund-aum" />
              <Field label="Expense Ratio %" type="number" step="0.01" v={form.expense_ratio} set={(v) => setForm({ ...form, expense_ratio: v })} testid="fund-expense" />
              <Field label="Rating" type="number" step="0.1" v={form.rating} set={(v) => setForm({ ...form, rating: v })} testid="fund-rating" />
              <Field label="1Y Return %" type="number" step="0.1" v={form.returns_1y} set={(v) => setForm({ ...form, returns_1y: v })} testid="fund-1y" />
              <Field label="3Y CAGR %" type="number" step="0.1" v={form.returns_3y} set={(v) => setForm({ ...form, returns_3y: v })} testid="fund-3y" />
              <Field label="5Y CAGR %" type="number" step="0.1" v={form.returns_5y} set={(v) => setForm({ ...form, returns_5y: v })} testid="fund-5y" />
              <Field label="Min SIP ₹" type="number" v={form.min_sip} set={(v) => setForm({ ...form, min_sip: v })} testid="fund-min-sip" />
              <Field label="Min Lumpsum ₹" type="number" v={form.min_lumpsum} set={(v) => setForm({ ...form, min_lumpsum: v })} testid="fund-min-lumpsum" />
            </div>
            <button onClick={save} className="btn-brand mt-6 w-full justify-center" data-testid="save-fund-btn">
              {editingId ? "Save changes" : "Create fund"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, v, set, type = "text", step, placeholder, full, disabled, testid }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="overline block mb-2">{label}</label>
      <input className="input-flat" type={type} step={step} value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder} disabled={disabled} data-testid={testid} />
    </div>
  );
}

function SelectField({ label, v, set, options, testid }) {
  return (
    <div>
      <label className="overline block mb-2">{label}</label>
      <select className="input-flat" value={v} onChange={(e) => set(e.target.value)} data-testid={testid}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
