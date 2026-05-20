import { useEffect, useState } from "react";
import api from "../lib/api";
import { fmtPct } from "../utils/format";
import { Plus, X } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = ["#0F2A5C", "#C9A95C", "#4DB6E5"];

export default function Compare() {
  const [allFunds, setAllFunds] = useState([]);
  const [selected, setSelected] = useState([]);
  const [data, setData] = useState([]);
  const [picker, setPicker] = useState(false);

  useEffect(() => { api.get("/funds").then((r) => setAllFunds(r.data)); }, []);

  useEffect(() => {
    if (selected.length === 0) { setData([]); return; }
    api.get(`/compare?ids=${selected.join(",")}`).then((r) => setData(r.data));
  }, [selected]);

  const add = (id) => {
    if (selected.includes(id) || selected.length >= 3) return;
    setSelected([...selected, id]);
    setPicker(false);
  };

  const remove = (id) => setSelected(selected.filter((s) => s !== id));

  // Build chart data: normalize to base 100
  const chartData = (() => {
    if (data.length === 0) return [];
    const len = Math.min(...data.map((d) => d.nav_history.length));
    const points = [];
    for (let i = 0; i < len; i += 7) {
      const row = { date: data[0].nav_history[i].date };
      data.forEach((d, idx) => {
        const base = d.nav_history[0].nav;
        row[`f${idx}`] = ((d.nav_history[i].nav / base) * 100).toFixed(2);
      });
      points.push(row);
    }
    return points;
  })();

  return (
    <div className="space-y-6 animate-in" data-testid="compare-page">
      <div>
        <div className="overline mb-2">Invest</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Compare Funds</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Place up to 3 funds side by side. NAV history rebased to 100 for fair comparison.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((slot) => {
          const f = data[slot];
          return (
            <div key={slot} className="surface p-5 min-h-[140px]" data-testid={`compare-slot-${slot}`}>
              {f ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display font-semibold tracking-tight text-sm truncate" style={{ color: COLORS[slot] }}>{f.name}</div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{f.amc}</div>
                    </div>
                    <button onClick={() => remove(f.id)} className="p-1 hover:bg-[var(--brand-soft)] rounded" data-testid={`remove-compare-${f.id}`}>
                      <X size={14} style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Mini label="1Y" v={fmtPct(f.returns_1y)} pos={f.returns_1y >= 0} />
                    <Mini label="3Y" v={fmtPct(f.returns_3y)} pos={f.returns_3y >= 0} />
                    <Mini label="5Y" v={fmtPct(f.returns_5y)} pos={f.returns_5y >= 0} />
                  </div>
                </>
              ) : (
                <button onClick={() => setPicker(true)} className="w-full h-full min-h-[100px] flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed" style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }} data-testid={`add-compare-${slot}`}>
                  <Plus size={20} />
                  <span className="text-sm font-medium">Add Fund</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {data.length > 0 && (
        <>
          <div className="surface p-6">
            <div className="overline mb-1">Growth comparison</div>
            <h2 className="font-display text-xl font-semibold tracking-tight mb-4">NAV Trend (rebased to 100)</h2>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" stroke="#8a9bb5" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={50} />
                  <YAxis stroke="#8a9bb5" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6ecf3", borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {data.map((d, i) => (
                    <Line key={d.id} type="monotone" dataKey={`f${i}`} stroke={COLORS[i]} strokeWidth={2} dot={false} name={d.name.slice(0, 30)} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {data.map((d, i) => <th key={d.id} style={{ color: COLORS[i] }}>{d.name.slice(0, 30)}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { k: "NAV", get: (d) => `₹${d.nav.toFixed(2)}` },
                  { k: "1Y Return", get: (d) => fmtPct(d.returns_1y) },
                  { k: "3Y CAGR", get: (d) => fmtPct(d.returns_3y) },
                  { k: "5Y CAGR", get: (d) => fmtPct(d.returns_5y) },
                  { k: "Expense Ratio", get: (d) => `${d.expense_ratio}%` },
                  { k: "AUM", get: (d) => `₹${d.aum_cr.toLocaleString("en-IN")} Cr` },
                  { k: "Rating", get: (d) => `★ ${d.rating}` },
                  { k: "Risk", get: (d) => d.risk },
                  { k: "Min SIP", get: (d) => `₹${d.min_sip}` },
                ].map((r) => (
                  <tr key={r.k}>
                    <td className="font-medium" style={{ color: "var(--text-muted)" }}>{r.k}</td>
                    {data.map((d) => <td key={d.id} className="font-mono text-sm">{r.get(d)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,42,92,0.5)" }}>
          <div className="surface max-w-lg w-full p-5 max-h-[80vh] overflow-hidden flex flex-col" data-testid="fund-picker">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold tracking-tight">Select a fund</h3>
              <button onClick={() => setPicker(false)}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {allFunds.filter((f) => !selected.includes(f.id)).map((f) => (
                <button key={f.id} onClick={() => add(f.id)} className="w-full text-left p-3 rounded-md hover:bg-[var(--brand-soft)] transition" data-testid={`pick-fund-${f.id}`}>
                  <div className="font-medium text-sm">{f.name}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {f.category} · 3Y {fmtPct(f.returns_3y)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, v, pos }) {
  return (
    <div>
      <div className="overline mb-1">{label}</div>
      <div className={`font-mono text-sm font-semibold ${pos ? "positive" : "negative"}`}>{v}</div>
    </div>
  );
}
