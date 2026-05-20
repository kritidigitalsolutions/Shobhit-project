import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@shobhitcapital.com");
  const [password, setPassword] = useState("Demo@1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  };

  const bgImg = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80&auto=format&fit=crop";

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="auth-container">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md animate-in">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "var(--brand)" }}>
              <span className="font-display text-white font-bold text-xl">S</span>
            </div>
            <div>
              <div className="font-display font-bold tracking-tight">Shobhit Capital</div>
              <div className="overline">Mutual Fund Advisor</div>
            </div>
          </div>

          <div className="overline mb-2">Sign in</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none mb-3">
            Your wealth, in focus.
          </h1>
          <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>
            Track your mutual fund portfolio, run SIPs, and discover top funds — all from one calm cockpit.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="overline block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="input-flat"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="overline block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="input-flat"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="text-sm" data-testid="login-error" style={{ color: "var(--negative)" }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="btn-brand w-full justify-center mt-6"
            >
              {loading ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 surface-flat p-4">
            <div className="overline mb-1">Demo Account</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              demo@shobhitcapital.com · Demo@1234
            </div>
          </div>

          <div className="mt-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            New investor?{" "}
            <Link to="/register" data-testid="register-link" className="font-medium" style={{ color: "var(--brand)" }}>
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* Right: brand image */}
      <div className="hidden lg:block relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f2a5c 0%, #163a76 60%, #1f4a92 100%)" }}>
        <div className="absolute inset-0 opacity-25">
          <img src={bgImg} alt="" className="w-full h-full object-cover mix-blend-overlay" />
        </div>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 100% 0%, rgba(201,169,92,0.18) 0%, transparent 55%)" }} />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="overline text-white/70 mb-3" style={{ color: "var(--accent-gold)" }}>Trusted by mindful investors</div>
          <div className="font-display text-3xl font-semibold tracking-tight max-w-lg leading-tight">
            Research, monitor, and grow your mutual fund investments — without the noise.
          </div>
          <div className="mt-8 flex items-center gap-6 text-white/80 text-xs">
            <div>
              <div className="font-display text-2xl font-bold text-white">₹2,400 Cr+</div>
              <div className="overline mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Assets Tracked</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">15,000+</div>
              <div className="overline mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Investors</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">SEBI</div>
              <div className="overline mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Registered</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
