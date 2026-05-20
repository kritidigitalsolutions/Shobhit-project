import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Search,
  Repeat,
  ListChecks,
  Calculator,
  ShieldCheck,
  Star,
  LogOut,
  CircleUser,
  Target,
  Receipt,
  FileText,
  Newspaper,
  GitCompare,
  Bell,
  Gift,
  Smartphone,
  Sparkles,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const sections = [
  {
    title: "Overview",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
      { to: "/advisor", label: "AI Advisor", icon: Sparkles, testid: "nav-advisor", badge: "AI" },
      { to: "/insights", label: "Insights", icon: Newspaper, testid: "nav-insights" },
    ],
  },
  {
    title: "Invest",
    links: [
      { to: "/funds", label: "Fund Explorer", icon: Search, testid: "nav-funds" },
      { to: "/compare", label: "Compare", icon: GitCompare, testid: "nav-compare" },
      { to: "/watchlist", label: "Watchlist", icon: Star, testid: "nav-watchlist" },
      { to: "/sips", label: "SIPs", icon: Repeat, testid: "nav-sips" },
    ],
  },
  {
    title: "Plan",
    links: [
      { to: "/goals", label: "Goals", icon: Target, testid: "nav-goals" },
      { to: "/calculators", label: "Calculators", icon: Calculator, testid: "nav-calculators" },
      { to: "/tax", label: "Tax Center", icon: Receipt, testid: "nav-tax" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/transactions", label: "Transactions", icon: ListChecks, testid: "nav-transactions" },
      { to: "/reports", label: "Reports", icon: FileText, testid: "nav-reports" },
      { to: "/kyc", label: "KYC Status", icon: ShieldCheck, testid: "nav-kyc" },
      { to: "/referrals", label: "Refer & Earn", icon: Gift, testid: "nav-referrals" },
      { to: "/install", label: "Get the App", icon: Smartphone, testid: "nav-install", badge: "APK" },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get("/notifications").then((r) => setUnread(r.data.filter((n) => !n.read).length)).catch(() => {});
  }, []);

  return (
    <aside className="sidebar w-64 shrink-0 hidden md:flex flex-col h-screen sticky top-0" data-testid="app-sidebar">
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
            <span className="font-display text-[#0f2a5c] font-extrabold text-lg">S</span>
          </div>
          <div>
            <div className="font-display text-[15px] font-bold leading-none tracking-tight text-white">
              Shobhit Capital
            </div>
            <div className="overline mt-1.5">Investor Suite</div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={() => navigate("/notifications")}
          className="sidebar-link w-full justify-between"
          data-testid="nav-notifications"
        >
          <span className="inline-flex items-center gap-3"><Bell size={17} className="icon" /> Notifications</span>
          {unread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-gold)", color: "#2a1e00" }}>
              {unread}
            </span>
          )}
        </button>
      </div>

      <div className="divider-dark mx-4 my-3" />

      <nav className="flex-1 px-4 space-y-5 overflow-y-auto pb-4">
        {sections.map((s) => (
          <div key={s.title}>
            <div className="overline px-3 mb-2">{s.title}</div>
            <div className="space-y-1">
              {s.links.map((l) => {
                const Icon = l.icon;
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    data-testid={l.testid}
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                  >
                    <Icon size={17} className="icon" />
                    <span className="flex-1">{l.label}</span>
                    {l.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--accent-gold)", color: "#2a1e00" }}>
                        {l.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 pb-5 pt-2">
        <div className="divider-dark mb-3" />
        {user?.role === "admin" && (
          <NavLink to="/admin" className="sidebar-link w-full" data-testid="nav-admin-panel">
            <Shield size={17} className="icon" />
            <span className="flex-1">Admin Console</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--accent-gold)", color: "#2a1e00" }}>
              ADMIN
            </span>
          </NavLink>
        )}
        <button
          onClick={() => navigate("/profile")}
          data-testid="nav-profile-btn"
          className="sidebar-link w-full"
        >
          <CircleUser size={17} className="icon" />
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-sm truncate max-w-[160px]">{user?.name || "Investor"}</span>
            <span className="text-[11px] truncate max-w-[160px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {user?.email}
            </span>
          </div>
        </button>
        <button onClick={logout} data-testid="logout-btn" className="sidebar-link w-full mt-1">
          <LogOut size={16} className="icon" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
