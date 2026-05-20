import { useEffect, useState } from "react";
import api from "../lib/api";
import { Copy, Gift, Users, Trophy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { fmtINR } from "../utils/format";

export default function Referrals() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/referrals").then((r) => setData(r.data)); }, []);

  if (!data) return <div className="overline">Loading…</div>;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6 animate-in" data-testid="referrals-page">
      <div>
        <div className="overline mb-2">Earn</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Refer & Earn</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Invite friends to invest mindfully. Earn ₹250 for every friend who completes their first SIP.
        </p>
      </div>

      <div className="gold-edge p-8 relative">
        <div className="grid lg:grid-cols-2 gap-6 relative z-10">
          <div>
            <div className="overline text-white/60 mb-3">Your Referral Code</div>
            <div className="flex items-center gap-3 mb-5">
              <div className="font-display text-4xl font-bold tracking-tight text-white">{data.code}</div>
              <button onClick={() => copy(data.code)} className="p-2 rounded-md hover:bg-white/10 transition" data-testid="copy-code-btn">
                <Copy size={18} className="text-white/80" />
              </button>
            </div>
            <div className="surface-flat p-3 flex items-center gap-2 mb-4" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="text-sm flex-1 truncate font-mono" style={{ color: "rgba(255,255,255,0.85)" }}>{data.share_url}</div>
              <button onClick={() => copy(data.share_url)} className="text-xs px-2 py-1 rounded font-medium" style={{ background: "var(--accent-gold)", color: "#2a1e00" }} data-testid="copy-link-btn">
                Copy
              </button>
            </div>
            <button className="btn-gold" data-testid="share-btn"
              onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ title: "Shobhit Capital", url: data.share_url }); }
                catch (err) { if (err && err.name !== "AbortError") console.warn("share failed", err); }
                } else { copy(data.share_url); }
              }}>
              <Share2 size={15} /> Share with friends
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Friends Invested" value={data.referred_count} icon={Users} />
            <Stat label="Rewards Earned" value={fmtINR(data.rewards_earned)} icon={Gift} />
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="surface p-6">
        <div className="overline mb-1">Unlock</div>
        <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Referral Tiers</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {data.tiers.map((t, i) => {
            const unlocked = data.referred_count >= t.count;
            return (
              <div key={t.count} className="surface-flat p-5" data-testid={`tier-${t.count}`} style={{ borderColor: unlocked ? "var(--accent-gold)" : "var(--border-soft)" }}>
                <div className="flex items-center justify-between mb-3">
                  <Trophy size={20} style={{ color: unlocked ? "var(--accent-gold)" : "var(--text-muted)" }} />
                  <span className={`tag ${unlocked ? "tag-gold" : ""}`}>{unlocked ? "Unlocked" : "Locked"}</span>
                </div>
                <div className="font-display text-xl font-semibold tracking-tight">{t.label}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Refer {t.count} friend{t.count > 1 ? "s" : ""}</div>
                <div className="mt-3 font-mono font-bold" style={{ color: "var(--brand)" }}>{fmtINR(t.reward)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="surface p-6">
        <div className="overline mb-1">How it works</div>
        <h2 className="font-display text-xl font-semibold tracking-tight mb-5">3 simple steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Share your code", d: "Send your unique code or link to friends who want to invest." },
            { n: "02", t: "They sign up & invest", d: "Your friend creates an account and starts their first SIP of ₹500+." },
            { n: "03", t: "Both earn ₹250", d: "Reward credits to your wallet within 7 days of first installment." },
          ].map((s) => (
            <div key={s.n}>
              <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-gold)" }}>{s.n}</div>
              <div className="font-display font-semibold tracking-tight mt-2">{s.t}</div>
              <div className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="p-5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="overline text-white/60">{label}</div>
        <Icon size={16} className="text-white/60" />
      </div>
      <div className="font-display text-3xl font-bold tracking-tight text-white">{value}</div>
    </div>
  );
}
