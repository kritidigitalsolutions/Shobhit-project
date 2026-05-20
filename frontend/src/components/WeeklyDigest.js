import { useEffect, useState } from "react";
import api from "../lib/api";
import { fmtINR } from "../utils/format";
import { Sparkles, RefreshCw, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function WeeklyDigest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/digest/weekly");
      setData(d);
      if (refresh) toast.success("Digest refreshed");
    } catch (e) {
      if (refresh) toast.error("Couldn't refresh digest");
    }
    setLoading(false);
  };

  useEffect(() => { load(false); }, []);

  if (!data) return null;
  const { facts, narrative } = data;
  const up = (facts.week_pnl || 0) >= 0;

  return (
    <div className="gold-edge p-6 md:p-7 relative animate-in" data-testid="weekly-digest">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} style={{ color: "var(--accent-gold)" }} />
              <span className="overline" style={{ color: "rgba(255,255,255,0.7)" }}>This week in your portfolio</span>
            </div>
            <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight text-white">
              Weekly Digest — {facts.week_of}
            </h3>
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 transition"
            style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}
            data-testid="digest-refresh-btn"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat
            label="Current"
            value={fmtINR(facts.current_value, { compact: true })}
          />
          <Stat
            label="Week P&L"
            value={fmtINR(facts.week_pnl, { compact: true })}
            tone={up ? "pos" : "neg"}
            icon={up ? TrendingUp : TrendingDown}
          />
          <Stat
            label="SIPs due"
            value={facts.upcoming_sips.length}
            icon={Calendar}
            sub={facts.upcoming_sips[0]?.next_date}
          />
        </div>

        {/* Narrative */}
        <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.92)" }} data-testid="digest-narrative">
          {narrative}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, icon: Icon, sub }) {
  const color = tone === "pos" ? "#5ee7a3" : tone === "neg" ? "#ff8a78" : "var(--accent-gold)";
  return (
    <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="overline text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</div>
        {Icon && <Icon size={12} style={{ color: "rgba(255,255,255,0.6)" }} />}
      </div>
      <div className="font-display text-base md:text-lg font-bold tracking-tight" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{sub}</div>}
    </div>
  );
}
