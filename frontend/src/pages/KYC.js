import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function KYC() {
  const [kyc, setKyc] = useState(null);
  const [form, setForm] = useState({ pan: "", aadhaar: "", bank_account: "", ifsc: "", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/kyc").then((r) => {
      setKyc(r.data);
      setForm({
        pan: r.data.pan || "",
        aadhaar: r.data.aadhaar || "",
        bank_account: r.data.bank_account || "",
        ifsc: r.data.ifsc || "",
        address: r.data.address || "",
      });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([_, v]) => v && v.trim() !== ""));
      const { data } = await api.put("/kyc", payload);
      setKyc(data);
      toast.success("KYC details updated");
    } catch (e) { toast.error(formatApiError(e)); }
    setSaving(false);
  };

  if (!kyc) return <div className="overline">Loading KYC…</div>;

  const steps = [
    { key: "pan_verified", label: "PAN Verification" },
    { key: "aadhaar_verified", label: "Aadhaar Verification" },
    { key: "bank_verified", label: "Bank Linking" },
    { key: "address_verified", label: "Address Proof" },
  ];
  const done = steps.filter((s) => kyc[s.key]).length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <div className="space-y-6 animate-in" data-testid="user-profile">
      <div>
        <div className="overline mb-2">Compliance</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">KYC Status</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="surface p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Progress</div>
            <span className="tag">{kyc.status}</span>
          </div>
          <div className="font-display text-5xl font-bold tracking-tight">{pct}%</div>
          <div className="h-2 mt-4 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--brand)" }} />
          </div>

          <div className="mt-6 space-y-3">
            {steps.map((s) => (
              <div key={s.key} className="flex items-center gap-3 text-sm" data-testid={`kyc-step-${s.key}`}>
                {kyc[s.key] ? (
                  <CheckCircle2 size={18} style={{ color: "var(--brand)" }} />
                ) : (
                  <Circle size={18} style={{ color: "var(--text-muted)" }} />
                )}
                <span style={{ color: kyc[s.key] ? "var(--text-primary)" : "var(--text-secondary)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6 lg:col-span-2">
          <div className="overline mb-1">Submit Details</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-5">Verify Identity</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="PAN" v={form.pan} set={(v) => setForm({ ...form, pan: v.toUpperCase() })} placeholder="ABCDE1234F" testid="kyc-pan" />
            <Field label="Aadhaar" v={form.aadhaar} set={(v) => setForm({ ...form, aadhaar: v })} placeholder="XXXX-XXXX-1234" testid="kyc-aadhaar" />
            <Field label="Bank Account" v={form.bank_account} set={(v) => setForm({ ...form, bank_account: v })} placeholder="XXXXXX5678" testid="kyc-bank" />
            <Field label="IFSC" v={form.ifsc} set={(v) => setForm({ ...form, ifsc: v.toUpperCase() })} placeholder="HDFC0001234" testid="kyc-ifsc" />
            <div className="sm:col-span-2">
              <Field label="Address" v={form.address} set={(v) => setForm({ ...form, address: v })} placeholder="City, State" testid="kyc-address" />
            </div>
          </div>
          <button onClick={save} disabled={saving} className="btn-brand mt-6" data-testid="kyc-save-btn">
            <ShieldCheck size={16} /> {saving ? "Saving…" : "Submit & Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, set, placeholder, testid }) {
  return (
    <div>
      <label className="overline block mb-2">{label}</label>
      <input className="input-flat" value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder} data-testid={testid} />
    </div>
  );
}
