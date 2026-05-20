import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created");
      navigate("/dashboard");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" data-testid="register-container">
      <div className="w-full max-w-md animate-in">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "var(--brand)" }}>
            <span className="font-display text-white font-bold text-xl">S</span>
          </div>
          <div>
            <div className="font-display font-bold tracking-tight">Shobhit Capital</div>
            <div className="overline">Open Account</div>
          </div>
        </div>

        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Start investing today.</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Open a free investor account — no paperwork, no hassle.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="overline block mb-2">Full Name</label>
            <input data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)} required className="input-flat" />
          </div>
          <div>
            <label className="overline block mb-2">Email</label>
            <input type="email" data-testid="register-email-input" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-flat" />
          </div>
          <div>
            <label className="overline block mb-2">Password</label>
            <input type="password" data-testid="register-password-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-flat" />
          </div>
          {error && (
            <div className="text-sm" data-testid="register-error" style={{ color: "var(--negative)" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} data-testid="register-submit-btn" className="btn-brand w-full justify-center mt-4">
            {loading ? "Creating…" : "Create account"} <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-8 text-sm" style={{ color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-medium" data-testid="login-link" style={{ color: "var(--brand)" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
