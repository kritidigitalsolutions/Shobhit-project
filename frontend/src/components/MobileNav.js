import { NavLink } from "react-router-dom";
import { Home, PieChart, Repeat, Search, Sparkles } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home, testid: "tab-home" },
  { to: "/funds", label: "Explore", icon: Search, testid: "tab-explore" },
  { to: "/sips", label: "SIPs", icon: Repeat, testid: "tab-sips" },
  { to: "/dashboard?view=portfolio", label: "Portfolio", icon: PieChart, testid: "tab-portfolio", match: "/dashboard" },
  { to: "/advisor", label: "Sage", icon: Sparkles, testid: "tab-advisor" },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border-soft)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      data-testid="mobile-bottom-nav"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink
            key={t.label}
            to={t.to}
            data-testid={t.testid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide ${
                isActive ? "text-[var(--brand)]" : "text-[var(--text-muted)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className="uppercase">{t.label}</span>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-10 rounded-b" style={{ background: "var(--accent-gold)" }} />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
