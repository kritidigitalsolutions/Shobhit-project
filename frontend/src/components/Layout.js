import { Outlet, useLocation, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MarketTicker from "./MarketTicker";
import { Bell, Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const loc = useLocation();
  const { user } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen" data-testid="app-layout" key={loc.pathname}>
      <MarketTicker />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-24 md:pb-0">
          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3" style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-soft)" }}>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="p-2 -ml-2" data-testid="mobile-menu-btn">
              <Menu size={20} style={{ color: "var(--text-primary)" }} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
                <span className="font-display text-[#0f2a5c] font-extrabold text-sm">S</span>
              </div>
              <span className="font-display font-bold tracking-tight text-sm">Shobhit Capital</span>
            </div>
            <Link to="/notifications" className="p-2 -mr-2" data-testid="mobile-notif-btn">
              <Bell size={19} style={{ color: "var(--text-primary)" }} />
            </Link>
          </header>

          {/* Mobile slide-over menu */}
          {mobileMenu && (
            <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileMenu(false)} data-testid="mobile-menu-overlay">
              <div className="absolute inset-0" style={{ background: "rgba(15,42,92,0.5)" }} />
              <div className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
                <div className="h-full overflow-y-auto" style={{ background: "var(--bg-sidebar)" }}>
                  <Sidebar />
                </div>
              </div>
            </div>
          )}

          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-5 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      {/* Hidden invisible spacer to acknowledge user for tests */}
      <div className="sr-only" data-testid="auth-user-name">{user?.name}</div>
    </div>
  );
}
