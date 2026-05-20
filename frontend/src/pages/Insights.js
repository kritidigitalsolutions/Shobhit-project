import { useEffect, useState } from "react";
import api from "../lib/api";
import { Newspaper, Sparkles } from "lucide-react";

export default function Insights() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/insights").then((r) => setItems(r.data)); }, []);

  const relevant = items.filter((i) => i.relevant);
  const others = items.filter((i) => !i.relevant);

  return (
    <div className="space-y-8 animate-in" data-testid="insights-page">
      <div>
        <div className="overline mb-2">Market</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">Insights</h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Curated news and research, personalized to your portfolio.
        </p>
      </div>

      {relevant.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: "var(--accent-gold)" }} />
            <div className="overline">For your portfolio</div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {relevant.map((n) => <Card key={n.id} item={n} highlighted />)}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Newspaper size={16} style={{ color: "var(--text-muted)" }} />
          <div className="overline">Latest</div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {others.map((n) => <Card key={n.id} item={n} />)}
        </div>
      </section>
    </div>
  );
}

function Card({ item, highlighted }) {
  return (
    <article className="surface p-5 hover:border-[var(--brand)] transition cursor-pointer" data-testid={`news-${item.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`tag ${highlighted ? "tag-gold" : ""}`}>{item.category}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.source} · {item.published}</span>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight leading-snug mb-2">{item.title}</h3>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.summary}</p>
    </article>
  );
}
