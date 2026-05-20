import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { fmtINR, fmtPct } from "../utils/format";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";

export default function FundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [showInvest, setShowInvest] = useState(false);
  const [mode, setMode] = useState("lumpsum"); // lumpsum | sip
  const [amount, setAmount] = useState(5000);
  const [submitting, setSubmitting] = useState(false);
  const [range, setRange] = useState("1Y");

  useEffect(() => { api.get(`/funds/${id}`).then((r) => setFund(r.data)); }, [id]);

  if (!fund) return <div className="overline">Loading fund…</div>;

  const days = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[range];
  const navData = fund.nav_history.slice(-days);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (mode === "lumpsum") {
        await api.post("/portfolio/invest", { fund_id: id, amount: Number(amount) });
        toast.success(`Invested ${fmtINR(amount)} in ${fund.name}`);
      } else {
        await api.post("/sips", { fund_id: id, amount: Number(amount), frequency: "monthly" });
        toast.success(`SIP started — ${fmtINR(amount)}/month`);
      }
      setShowInvest(false);
      navigate("/dashboard");
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in" data-testid="fund-detail">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }} data-testid="back-btn">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="overline mb-2">{fund.amc}</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight max-w-3xl">{fund.name}</h1>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="tag">{fund.category}</span>
            <span className={`tag ${fund.risk === "High" ? "tag-terracotta" : fund.risk === "Low" ? "tag-sky" : "tag-clay"}`}>{fund.risk} risk</span>
            <span className="tag tag-sky">★ {fund.rating}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setMode("sip"); setAmount(fund.min_sip); setShowInvest(true); }} className="btn-ghost" data-testid="start-sip-btn">
            Start SIP
          </button>
          <button onClick={() => { setMode("lumpsum"); setAmount(fund.min_lumpsum); setShowInvest(true); }} className="btn-brand" data-testid="invest-lumpsum-btn">
            Invest Lumpsum
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px" style={{ background: "var(--border-soft)" }}>
        <Tile label="NAV" value={`₹${fund.nav.toFixed(2)}`} />
        <Tile label="1Y Return" value={fmtPct(fund.returns_1y)} tone={fund.returns_1y >= 0 ? "pos" : "neg"} />
        <Tile label="3Y CAGR" value={fmtPct(fund.returns_3y)} tone={fund.returns_3y >= 0 ? "pos" : "neg"} />
        <Tile label="5Y CAGR" value={fmtPct(fund.returns_5y)} tone={fund.returns_5y >= 0 ? "pos" : "neg"} />
        <Tile label="AUM" value={`₹${fund.aum_cr.toLocaleString("en-IN")} Cr`} />
      </div>

      {/* NAV chart */}
      <div className="surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="overline mb-1">NAV History</div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Trend</h2>
          </div>
          <div className="flex gap-1">
            {["1M", "3M", "6M", "1Y"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition`}
                style={{
                  background: range === r ? "var(--brand)" : "transparent",
                  color: range === r ? "white" : "var(--text-secondary)",
                  border: "1px solid " + (range === r ? "var(--brand)" : "var(--border-soft)"),
                }}
                data-testid={`range-${r}`}
              >{r}</button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={navData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF3" vertical={false} />
              <XAxis dataKey="date" stroke="#8a9bb5" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E6ECF3", borderRadius: 6, fontSize: 12 }} />
              <Line type="monotone" dataKey="nav" stroke="#0F2A5C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings + details */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="surface p-6 lg:col-span-2">
          <div className="overline mb-1">Composition</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Top Holdings</h2>
          <div className="space-y-2">
            {fund.top_holdings.map((h, i) => (
              <div key={h} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs w-6" style={{ color: "var(--text-muted)" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm">{h}</span>
                </div>
                <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{(20 - i * 3).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6">
          <div className="overline mb-1">Fund Facts</div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Details</h2>
          <Row label="Expense Ratio" value={`${fund.expense_ratio}%`} />
          <Row label="AUM" value={`₹${fund.aum_cr.toLocaleString("en-IN")} Cr`} />
          <Row label="Min SIP" value={fmtINR(fund.min_sip)} />
          <Row label="Min Lumpsum" value={fmtINR(fund.min_lumpsum)} />
          <Row label="Rating" value={`★ ${fund.rating}`} last />
        </div>
      </div>

      {/* Invest modal */}
      {showInvest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,59,50,0.4)" }} data-testid="invest-modal">
          <div className="surface max-w-md w-full p-6 animate-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {mode === "lumpsum" ? "Invest Lumpsum" : "Start SIP"}
              </h3>
              <button onClick={() => setShowInvest(false)} data-testid="close-modal-btn"><X size={18} /></button>
            </div>
            <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{fund.name}</div>
            <div className="flex gap-2 mb-4 mt-4">
              <button onClick={() => { setMode("lumpsum"); setAmount(fund.min_lumpsum); }} className={`flex-1 py-2 text-sm rounded-md border font-medium ${mode === "lumpsum" ? "border-[var(--brand)] text-white" : ""}`} style={{ background: mode === "lumpsum" ? "var(--brand)" : "transparent" }}>Lumpsum</button>
              <button onClick={() => { setMode("sip"); setAmount(fund.min_sip); }} className={`flex-1 py-2 text-sm rounded-md border font-medium ${mode === "sip" ? "border-[var(--brand)] text-white" : ""}`} style={{ background: mode === "sip" ? "var(--brand)" : "transparent" }}>Monthly SIP</button>
            </div>
            <label className="overline block mb-2">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              min={mode === "lumpsum" ? fund.min_lumpsum : fund.min_sip}
              onChange={(e) => setAmount(e.target.value)}
              className="input-flat"
              data-testid="invest-amount-input"
            />
            <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Min: {mode === "lumpsum" ? fmtINR(fund.min_lumpsum) : fmtINR(fund.min_sip)}
            </div>
            <button onClick={submit} disabled={submitting} className="btn-brand w-full justify-center mt-6" data-testid="confirm-invest-btn">
              {submitting ? "Processing…" : mode === "lumpsum" ? `Invest ${fmtINR(amount)}` : `Start SIP ${fmtINR(amount)}/mo`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, tone }) {
  const t = tone === "pos" ? "positive" : tone === "neg" ? "negative" : "";
  return (
    <div className="bg-white p-5">
      <div className="overline mb-2">{label}</div>
      <div className={`font-display text-2xl font-bold tracking-tight ${t}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: last ? "none" : "1px solid var(--border-soft)" }}>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}
