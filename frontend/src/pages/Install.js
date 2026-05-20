import { useEffect, useState } from "react";
import { Smartphone, Download, ExternalLink, Apple, Check } from "lucide-react";
import { toast } from "sonner";

export default function Install() {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!installEvent) {
      toast.info("Open this page in Chrome on your phone and tap 'Add to Home Screen'.");
      return;
    }
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Installing Shobhit Capital…");
      setInstallEvent(null);
    }
  };

  const url = window.location.origin;

  return (
    <div className="space-y-6 animate-in" data-testid="install-page">
      <div>
        <div className="overline mb-2">Get the App</div>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-none">Install Shobhit Capital</h1>
        <p className="text-sm mt-3 max-w-xl" style={{ color: "var(--text-secondary)" }}>
          Three ways to put the app on your phone — pick whichever is easiest for you.
        </p>
      </div>

      {/* Option 1: PWA Install */}
      <div className="gold-edge p-7 relative" data-testid="option-pwa">
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="overline mb-2" style={{ color: "var(--accent-gold)" }}>Recommended</div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-2">Option 1 · Install as a Web App</h2>
              <p className="text-sm max-w-md" style={{ color: "rgba(255,255,255,0.8)" }}>
                Instant install — no Play Store, no download. Looks and feels exactly like the APK, with offline support and a Home Screen icon.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {installed ? (
                <button className="btn-gold" disabled data-testid="installed-state">
                  <Check size={16} /> Installed
                </button>
              ) : (
                <button onClick={install} className="btn-gold" data-testid="install-pwa-btn">
                  <Download size={16} /> Install now
                </button>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={16} style={{ color: "var(--accent-gold)" }} />
                <span className="text-sm font-semibold text-white">Chrome on Android</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                Open this page → tap the <strong>⋮</strong> menu → <strong>Install app</strong> (or Add to Home Screen).
              </p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Apple size={16} style={{ color: "var(--accent-gold)" }} />
                <span className="text-sm font-semibold text-white">Safari on iPhone</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                Open this page → tap the <strong>Share</strong> icon → <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Option 2: PWABuilder */}
      <div className="surface p-6" data-testid="option-pwabuilder">
        <h2 className="font-display text-xl font-bold tracking-tight mb-2">Option 2 · Generate an APK with PWABuilder</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Free service that converts this web app into a Play Store-ready signed APK in ~2 minutes. No Android Studio required.
        </p>
        <ol className="text-sm space-y-2 mb-4 pl-5 list-decimal" style={{ color: "var(--text-secondary)" }}>
          <li>Visit <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="font-medium underline" style={{ color: "var(--brand)" }}>pwabuilder.com</a></li>
          <li>Paste this URL: <code className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--brand)" }}>{url}</code></li>
          <li>Click <strong>Package for Stores</strong> → <strong>Android</strong> → download the signed APK</li>
        </ol>
        <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="btn-brand text-sm inline-flex" data-testid="pwabuilder-link">
          <ExternalLink size={14} /> Open PWABuilder
        </a>
      </div>

      {/* Option 3: Capacitor */}
      <div className="surface p-6" data-testid="option-capacitor">
        <h2 className="font-display text-xl font-bold tracking-tight mb-2">Option 3 · Build the APK Yourself (Capacitor)</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          A ready-to-build Capacitor 7 Android project lives at <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)" }}>/app/android-capacitor</code> — already wired to this backend. Requires Android Studio.
        </p>
        <pre className="text-xs p-4 rounded-lg overflow-x-auto font-mono" style={{ background: "var(--bg-sidebar)", color: "white" }}>
{`cd android-capacitor
yarn install
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
# APK ready at: app/build/outputs/apk/debug/app-debug.apk`}
        </pre>
        <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Package ID: <span className="font-mono">com.shobhit.shobhitcapital</span> · Connected to:&nbsp;
          <span className="font-mono">{url}</span>
        </div>
      </div>

      <div className="surface-flat p-4 text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
        <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--brand)" }} />
        <span>All three options connect to the same backend, so your portfolio, SIPs, transactions, AI advisor — everything works identically across web, PWA, and APK.</span>
      </div>
    </div>
  );
}
