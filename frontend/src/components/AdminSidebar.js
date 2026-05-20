import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, ListChecks, ShieldCheck, Megaphone, ScrollText, ArrowLeft, LogOut, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, testid: "admin-nav-overview", end: true },
  { to: "/admin/earnings", label: "My Earnings", icon: Wallet, testid: "admin-nav-earnings" },
  { to: "/admin/users", label: "Investors", icon: Users, testid: "admin-nav-users" },
  { to: "/admin/funds", label: "Funds", icon: Briefcase, testid: "admin-nav-funds" },
  { to: "/admin/transactions", label: "Transactions", icon: ListChecks, testid: "admin-nav-transactions" },
  { to: "/admin/kyc", label: "KYC Queue", icon: ShieldCheck, testid: "admin-nav-kyc" },
  { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone, testid: "admin-nav-broadcast" },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, testid: "admin-nav-audit" },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="sidebar w-64 shrink-0 hidden md:flex flex-col h-screen sticky top-0" data-testid="admin-sidebar">
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
            <span className="font-display text-[#0f2a5c] font-extrabold text-lg">S</span>
          </div>
          <div>
            <div className="font-display text-[15px] font-bold leading-none tracking-tight text-white">Shobhit Capital</div>
            <div className="overline mt-1.5" style={{ color: "var(--accent-gold)" }}>Admin Console</div>
          </div>
        </div>
      </div>

      <div className="divider-dark mx-4 mb-3" />

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
        <div className="overline px-3 mb-2">Manage</div>
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              data-testid={l.testid}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon size={17} className="icon" />
              <span>{l.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 pb-5 pt-2">
        <div className="divider-dark mb-3" />
        <NavLink to="/dashboard" className="sidebar-link" data-testid="admin-exit-btn">
          <ArrowLeft size={16} className="icon" /> Exit Admin
        </NavLink>
        <div className="px-3 py-2 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
          {user?.email}
        </div>
        <button onClick={logout} className="sidebar-link w-full" data-testid="admin-logout-btn">
          <LogOut size={16} className="icon" /> Sign out
        </button>
      </div>
    </aside>
  );
}
