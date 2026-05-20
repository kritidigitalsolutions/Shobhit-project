import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { fmtPct } from "../utils/format";
import { Star, X } from "lucide-react";
import { toast } from "sonner";

export default function Watchlist() {
  const [funds, setFunds] = useState([]);
  const load = () => api.get("/watchlist").then((r) => setFunds(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await api.delete(`/watchlist/${id}`);
    toast.success("Removed from watchlist");
    load();
  };

  return (
    <div className="space-y-6 animate-in" data-testid="watchlist-page">
      <div>
        <div className="overline mb-2">Saved</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Watchlist</h1>
      </div>

      {funds.length === 0 ? (
        <div className="surface p-12 text-center">
          <Star size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <div className="font-display text-lg font-semibold tracking-tight">Your watchlist is empty</div>
          <p className="text-sm mt-2 mb-5" style={{ color: "var(--text-secondary)" }}>
            Track funds you're interested in by tapping the star icon on Fund Explorer.
          </p>
          <Link to="/funds" className="btn-brand inline-flex" data-testid="watchlist-explore-btn">Explore funds</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {funds.map((f) => (
            <div key={f.id} className="surface p-5" data-testid={`watch-card-${f.id}`}>
              <div className="flex items-start justify-between gap-3">
                <Link to={`/funds/${f.id}`} className="flex-1 min-w-0">
                  <div className="font-display font-semibold tracking-tight text-lg truncate">{f.name}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{f.amc}</div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="tag">{f.category}</span>
                    <span className="tag tag-clay">{f.risk}</span>
                  </div>
                </Link>
                <button onClick={() => remove(f.id)} className="p-2 hover:bg-[var(--brand-soft)] rounded-md" data-testid={`remove-watch-${f.id}`}>
                  <X size={16} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div><div className="overline mb-1">1Y</div><div className={`font-mono text-sm font-semibold ${f.returns_1y >= 0 ? "positive" : "negative"}`}>{fmtPct(f.returns_1y)}</div></div>
                <div><div className="overline mb-1">3Y</div><div className={`font-mono text-sm font-semibold ${f.returns_3y >= 0 ? "positive" : "negative"}`}>{fmtPct(f.returns_3y)}</div></div>
                <div><div className="overline mb-1">NAV</div><div className="font-mono text-sm font-semibold">₹{f.nav.toFixed(2)}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
