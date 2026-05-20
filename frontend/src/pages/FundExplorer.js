import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { fmtPct } from "../utils/format";
import { Search, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["All", "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Large & Mid Cap", "ELSS", "Index", "Hybrid", "Debt"];
const RISKS = ["All", "Low", "Moderate", "High"];

export default function FundExplorer() {
  const [funds, setFunds] = useState([]);
  const [watchSet, setWatchSet] = useState(new Set());
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [risk, setRisk] = useState("All");
  const [sort, setSort] = useState("returns_3y");

  const fetchData = () => {
    api.get("/funds", { params: { category, risk, q: q || undefined } }).then((r) => setFunds(r.data));
    api.get("/watchlist").then((r) => setWatchSet(new Set(r.data.map((f) => f.id))));
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [category, risk]);
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const sorted = useMemo(() => [...funds].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)), [funds, sort]);

  const toggleWatch = async (fund_id) => {
    if (watchSet.has(fund_id)) {
      await api.delete(`/watchlist/${fund_id}`);
      const next = new Set(watchSet); next.delete(fund_id); setWatchSet(next);
      toast.success("Removed from watchlist");
    } else {
      await api.post("/watchlist", { fund_id });
      setWatchSet(new Set([...watchSet, fund_id]));
      toast.success("Added to watchlist");
    }
  };

  return (
    <div className="space-y-6 animate-in" data-testid="fund-explorer">
      <div>
        <div className="overline mb-2">Browse</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Fund Explorer</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Curated mutual funds across categories and risk levels — sorted by performance.
        </p>
      </div>

      {/* Filters */}
      <div className="surface p-5">
        <div className="grid md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search funds, AMCs…"
              className="input-flat pl-9"
              data-testid="funds-search-input"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-flat md:col-span-3" data-testid="funds-category-select">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="input-flat md:col-span-2" data-testid="funds-risk-select">
            {RISKS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-flat md:col-span-2" data-testid="funds-sort-select">
            <option value="returns_1y">1Y Returns</option>
            <option value="returns_3y">3Y Returns</option>
            <option value="returns_5y">5Y Returns</option>
            <option value="rating">Rating</option>
            <option value="aum_cr">AUM</option>
          </select>
        </div>
      </div>

      {/* Fund grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((f) => (
          <div key={f.id} className="surface p-5 hover:border-[var(--border-strong)] transition" data-testid={`fund-card-${f.id}`}>
            <div className="flex items-start justify-between gap-3">
              <Link to={`/funds/${f.id}`} className="block flex-1 min-w-0">
                <div className="font-display font-semibold tracking-tight text-lg truncate" style={{ color: "var(--text-primary)" }}>
                  {f.name}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{f.amc}</div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="tag">{f.category}</span>
                  <span className={`tag ${f.risk === "High" ? "tag-terracotta" : f.risk === "Low" ? "tag-sky" : "tag-clay"}`}>{f.risk} risk</span>
                  <span className="tag tag-sky">★ {f.rating}</span>
                </div>
              </Link>
              <button
                onClick={() => toggleWatch(f.id)}
                className="p-2 rounded-md hover:bg-[var(--brand-soft)] transition"
                data-testid={`watch-toggle-${f.id}`}
                aria-label="watchlist"
              >
                {watchSet.has(f.id) ? <Star size={18} fill="#C9A95C" stroke="#C9A95C" /> : <StarOff size={18} style={{ color: "var(--text-muted)" }} />}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-5">
              <Stat label="1Y" value={fmtPct(f.returns_1y)} positive={f.returns_1y >= 0} />
              <Stat label="3Y" value={fmtPct(f.returns_3y)} positive={f.returns_3y >= 0} />
              <Stat label="5Y" value={fmtPct(f.returns_5y)} positive={f.returns_5y >= 0} />
              <Stat label="NAV" value={`₹${f.nav.toFixed(2)}`} />
            </div>
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Min SIP ₹{f.min_sip} · Exp {f.expense_ratio}%
              </div>
              <Link to={`/funds/${f.id}`} className="btn-brand text-sm" style={{ padding: "0.4rem 0.85rem" }} data-testid={`invest-${f.id}`}>
                Invest
              </Link>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="lg:col-span-2 surface p-10 text-center" style={{ color: "var(--text-muted)" }}>
            No funds match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, positive }) {
  return (
    <div>
      <div className="overline mb-1">{label}</div>
      <div className={`font-mono text-sm font-semibold ${positive == null ? "" : positive ? "positive" : "negative"}`}>{value}</div>
    </div>
  );
}
