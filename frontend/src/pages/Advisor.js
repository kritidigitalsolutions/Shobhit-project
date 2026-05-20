import { useState, useRef, useEffect } from "react";
import api, { formatApiError } from "../lib/api";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const SUGGESTIONS = [
  "Is my portfolio diversified enough?",
  "How much should I invest monthly to retire with ₹2 Cr by 60?",
  "Which ELSS fund should I pick for tax saving?",
  "Should I switch from SIPs to lumpsum given current market?",
];

export default function Advisor() {
  const [messages, setMessages] = useState([
    { id: newId(), role: "assistant", content: "Hi! I'm Sage, your AI investment advisor. Ask me anything about your mutual fund portfolio, SIPs, tax planning, or goal setting. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: newId(), role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/advisor/chat", { message: msg, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error(formatApiError(e));
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in flex flex-col h-[calc(100vh-4rem)]" data-testid="advisor-page">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} style={{ color: "var(--accent-gold)" }} />
          <div className="overline">Powered by Claude</div>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight leading-none">AI Advisor — Sage</h1>
      </div>

      {/* Chat */}
      <div className="surface flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
                  <Sparkles size={14} style={{ color: "#0f2a5c" }} />
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                style={{
                  background: m.role === "user" ? "var(--brand)" : "var(--bg-elevated)",
                  color: m.role === "user" ? "white" : "var(--text-primary)",
                  border: m.role === "user" ? "none" : "1px solid var(--border-soft)",
                }}
                data-testid={`chat-msg-${m.id}`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #c9a95c 0%, #b89344 100%)" }}>
                <Sparkles size={14} style={{ color: "#0f2a5c" }} />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}>
                <Loader2 size={14} className="inline animate-spin mr-2" /> Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length === 1 && !loading && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border transition hover:bg-[var(--brand-soft)] hover:border-[var(--brand)]" style={{ borderColor: "var(--border-soft)", color: "var(--text-secondary)" }} data-testid={`suggestion-${s.slice(0, 10)}`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border-soft)" }}>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your portfolio…"
              className="input-flat"
              disabled={loading}
              data-testid="chat-input"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-brand" data-testid="chat-send-btn">
              <Send size={16} />
            </button>
          </form>
          <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
            Sage provides educational guidance only. Not investment advice. Consult a SEBI-registered advisor for personal decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
