import { useState, useMemo } from "react";
import { fmtINR } from "../utils/format";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Calculators() {
  const [tab, setTab] = useState("sip"); // sip | lumpsum | goal

  return (
    <div className="space-y-6 animate-in" data-testid="financial-calculators">
      <div>
        <div className="overline mb-2">Plan</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Calculators</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>Project your future wealth with simple, transparent math.</p>
      </div>

      <div className="flex gap-2">
        {[
          { k: "sip", label: "SIP Calculator" },
          { k: "lumpsum", label: "Lumpsum" },
          { k: "goal", label: "Goal Planner" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            data-testid={`calc-tab-${t.k}`}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              background: tab === t.k ? "var(--brand)" : "transparent",
              color: tab === t.k ? "white" : "var(--text-secondary)",
              border: "1px solid " + (tab === t.k ? "var(--brand)" : "var(--border-soft)"),
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === "sip" && <SIPCalc />}
      {tab === "lumpsum" && <LumpsumCalc />}
      {tab === "goal" && <GoalCalc />}
    </div>
  );
}

function CalcShell({ inputs, summary, chart }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="surface p-6 space-y-5">{inputs}</div>
      <div className="surface p-6 space-y-6">
        <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border-soft)" }}>
          {summary}
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF3" vertical={false} />
              <XAxis dataKey="label" stroke="#8a9bb5" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "#fff", border: "1px solid #E6ECF3", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="invested" stackId="a" fill="#C9A95C" radius={[0, 0, 0, 0]} />
              <Bar dataKey="returns" stackId="a" fill="#0F2A5C" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#C9A95C" }} /> Invested</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#0F2A5C" }} /> Returns</div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, set, min, max, step, format }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="overline">{label}</label>
        <span className="font-mono text-sm font-semibold" style={{ color: "var(--brand)" }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[#4A6B56]" />
    </div>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="bg-white p-4">
      <div className="overline mb-1">{label}</div>
      <div className="font-display text-lg font-bold tracking-tight">{value}</div>
    </div>
  );
}

function SIPCalc() {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);

  const { invested, future, chart } = useMemo(() => {
    const n = years * 12;
    const r = rate / 100 / 12;
    const fv = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const inv = monthly * n;
    const chart = [];
    for (let y = 1; y <= years; y++) {
      const nn = y * 12;
      const f = monthly * ((Math.pow(1 + r, nn) - 1) / r) * (1 + r);
      const iv = monthly * nn;
      chart.push({ label: `Y${y}`, invested: Math.round(iv), returns: Math.round(f - iv) });
    }
    return { invested: Math.round(inv), future: Math.round(fv), chart };
  }, [monthly, years, rate]);

  return (
    <CalcShell
      inputs={
        <>
          <Slider label="Monthly SIP" value={monthly} set={setMonthly} min={500} max={100000} step={500} format={(v) => fmtINR(v)} />
          <Slider label="Duration (years)" value={years} set={setYears} min={1} max={30} step={1} format={(v) => `${v} yr`} />
          <Slider label="Expected Return %" value={rate} set={setRate} min={4} max={25} step={0.5} format={(v) => `${v}%`} />
        </>
      }
      summary={
        <>
          <SummaryTile label="Invested" value={fmtINR(invested, { compact: true })} />
          <SummaryTile label="Returns" value={fmtINR(future - invested, { compact: true })} />
          <SummaryTile label="Future Value" value={fmtINR(future, { compact: true })} />
        </>
      }
      chart={chart}
    />
  );
}

function LumpsumCalc() {
  const [amount, setAmount] = useState(100000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const { invested, future, chart } = useMemo(() => {
    const fv = amount * Math.pow(1 + rate / 100, years);
    const chart = [];
    for (let y = 1; y <= years; y++) {
      chart.push({ label: `Y${y}`, invested: amount, returns: Math.round(amount * Math.pow(1 + rate / 100, y) - amount) });
    }
    return { invested: amount, future: Math.round(fv), chart };
  }, [amount, years, rate]);

  return (
    <CalcShell
      inputs={
        <>
          <Slider label="Investment Amount" value={amount} set={setAmount} min={1000} max={5000000} step={1000} format={(v) => fmtINR(v)} />
          <Slider label="Duration (years)" value={years} set={setYears} min={1} max={30} step={1} format={(v) => `${v} yr`} />
          <Slider label="Expected Return %" value={rate} set={setRate} min={4} max={25} step={0.5} format={(v) => `${v}%`} />
        </>
      }
      summary={
        <>
          <SummaryTile label="Invested" value={fmtINR(invested, { compact: true })} />
          <SummaryTile label="Returns" value={fmtINR(future - invested, { compact: true })} />
          <SummaryTile label="Future Value" value={fmtINR(future, { compact: true })} />
        </>
      }
      chart={chart}
    />
  );
}

function GoalCalc() {
  const [target, setTarget] = useState(2500000);
  const [years, setYears] = useState(15);
  const [rate, setRate] = useState(12);

  const { sipNeeded, lumpsumNeeded, chart } = useMemo(() => {
    const n = years * 12;
    const r = rate / 100 / 12;
    const sip = target / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const lump = target / Math.pow(1 + rate / 100, years);
    const chart = [];
    for (let y = 1; y <= years; y++) {
      const nn = y * 12;
      const f = sip * ((Math.pow(1 + r, nn) - 1) / r) * (1 + r);
      const iv = sip * nn;
      chart.push({ label: `Y${y}`, invested: Math.round(iv), returns: Math.round(f - iv) });
    }
    return { sipNeeded: Math.round(sip), lumpsumNeeded: Math.round(lump), chart };
  }, [target, years, rate]);

  return (
    <CalcShell
      inputs={
        <>
          <Slider label="Goal Amount" value={target} set={setTarget} min={100000} max={20000000} step={50000} format={(v) => fmtINR(v, { compact: true })} />
          <Slider label="Years to Goal" value={years} set={setYears} min={1} max={30} step={1} format={(v) => `${v} yr`} />
          <Slider label="Expected Return %" value={rate} set={setRate} min={4} max={25} step={0.5} format={(v) => `${v}%`} />
        </>
      }
      summary={
        <>
          <SummaryTile label="Monthly SIP Needed" value={fmtINR(sipNeeded, { compact: true })} />
          <SummaryTile label="OR Lumpsum Today" value={fmtINR(lumpsumNeeded, { compact: true })} />
          <SummaryTile label="Goal" value={fmtINR(target, { compact: true })} />
        </>
      }
      chart={chart}
    />
  );
}
