import { useState, useEffect, useCallback } from "react";
import { X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "eagle-install-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

const SmartInstallBanner = () => {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    if (isIOS()) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-lg mx-auto rounded-xl border border-border bg-background/95 backdrop-blur-md p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold text-base">
              Install Eagle Amsterdam
            </p>
            {platform === "ios" ? (
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                Tap the{" "}
                <Share className="inline w-4 h-4 text-primary -mt-0.5" />{" "}
                share button, then select{" "}
                <span className="text-foreground font-medium">"Add to Home Screen"</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">
                Get the full app experience on your home screen.
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {platform === "android" && (
          <Button
            variant="eagle"
            size="sm"
            className="w-full mt-3"
            onClick={handleInstall}
          >
            INSTALL APP
          </Button>
        )}
      </div>
    </div>
  );
};

export default SmartInstallBanner;
