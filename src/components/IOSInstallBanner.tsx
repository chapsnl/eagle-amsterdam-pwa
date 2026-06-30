import { useState, useEffect } from "react";
import { X, Share } from "lucide-react";
import eagleLogo from "@/assets/eagle-logo-white.webp";

const DISMISS_KEY = "eagle-ios-banner-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isIOSSafari(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone(): boolean {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function shouldShow(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return true;
    const dismissedAt = parseInt(raw, 10);
    return Date.now() - dismissedAt > DISMISS_MS;
  } catch {
    return true;
  }
}

const IOSInstallBanner = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isIOSSafari() || isStandalone()) return;
    if (!shouldShow()) return;
    const t = setTimeout(() => setOpen(true), 50);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-fade-in">
      <div className="bg-black border-t-2 border-primary rounded-t-xl p-4 shadow-2xl font-['Manrope',sans-serif]">
        <div className="flex items-center gap-3">
          <img
            src={eagleLogo}
            alt="Eagle Amsterdam"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-foreground font-bold text-sm"
              style={{ letterSpacing: "-0.03em" }}
            >
              Voeg Eagle toe aan je beginscherm
            </p>
            <p
              className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1 flex-wrap"
              style={{ letterSpacing: "-0.02em" }}
            >
              Tik op delen{" "}
              <Share className="inline w-3.5 h-3.5 text-primary" /> en kies
              &apos;Zet op beginscherm&apos;
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Sluiten"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallBanner;
