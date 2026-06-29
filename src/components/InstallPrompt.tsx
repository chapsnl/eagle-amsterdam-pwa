import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";

const DISMISS_KEY = "eagle_install_prompt_dismissed_at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const iPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

function recentlyDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - parseInt(v, 10) < DISMISS_MS;
  } catch {
    return false;
  }
}

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (isIOS()) setShowIOS(true);

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShowAndroid(false);
    setShowIOS(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    setShowAndroid(false);
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto bg-black border-2 border-primary rounded-xl p-4 shadow-2xl font-['Manrope',sans-serif] animate-fade-in">
      <button
        onClick={dismiss}
        aria-label="Sluiten"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      {showAndroid ? (
        <div className="flex items-center gap-3 pr-6">
          <div className="flex-1">
            <p className="text-foreground font-bold text-sm" style={{ letterSpacing: "-0.03em" }}>
              Installeer de Eagle App
            </p>
            <p className="text-muted-foreground text-xs mt-1" style={{ letterSpacing: "-0.02em" }}>
              Voeg toe aan je startscherm voor de volledige ervaring.
            </p>
          </div>
          <button
            onClick={install}
            className="shrink-0 bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            style={{ letterSpacing: "-0.02em" }}
          >
            Installeren
          </button>
        </div>
      ) : (
        <div className="pr-6">
          <p className="text-foreground font-bold text-sm" style={{ letterSpacing: "-0.03em" }}>
            Installeer de Eagle App
          </p>
          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1 flex-wrap" style={{ letterSpacing: "-0.02em" }}>
            Tik op <Share className="inline w-4 h-4 text-primary" /> en kies "Zet op beginscherm".
          </p>
        </div>
      )}
    </div>
  );
};

export default InstallPrompt;
