import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { fmtINR } from "../utils/format";
import { LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/portfolio"), api.get("/sips"), api.get("/transactions")]).then(([p, s, t]) => {
      setStats({
        invested: p.data.summary.invested,
        current: p.data.summary.current_value,
        holdings: p.data.summary.holdings_count,
        sips: s.data.length,
        txns: t.data.length,
      });
    });
  }, []);

  return (
    <div className="space-y-6 animate-in" data-testid="profile-page">
      <div>
        <div className="overline mb-2">Account</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Profile</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="surface p-6">
          <div className="w-16 h-16 rounded-md flex items-center justify-center mb-4" style={{ background: "var(--brand)" }}>
            <span className="font-display text-white text-2xl font-bold">{(user?.name || "I")[0].toUpperCase()}</span>
          </div>
          <div className="font-display text-xl font-semibold tracking-tight">{user?.name}</div>
          <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{user?.email}</div>
          <button onClick={logout} className="btn-ghost mt-6 w-full justify-center inline-flex" data-testid="profile-logout-btn">
            <LogOut size={16} /> Sign out
          </button>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: "var(--border-soft)" }}>
          <Tile label="Invested" value={stats ? fmtINR(stats.invested, { compact: true }) : "—"} />
          <Tile label="Current" value={stats ? fmtINR(stats.current, { compact: true }) : "—"} />
          <Tile label="Holdings" value={stats?.holdings ?? "—"} />
          <Tile label="SIPs" value={stats?.sips ?? "—"} />
          <Tile label="Transactions" value={stats?.txns ?? "—"} />
          <Tile label="Member since" value="2026" />
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-white p-5">
      <div className="overline mb-2">{label}</div>
      <div className="font-display text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
