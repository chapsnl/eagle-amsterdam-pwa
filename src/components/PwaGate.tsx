import { useState, useEffect } from "react";
import { Share, MoreVertical, Monitor } from "lucide-react";
import eagleLogo from "@/assets/eagle-logo-white.webp";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

type Platform = "ios" | "android" | "desktop";

const PwaGate = ({ children }: { children: React.ReactNode }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    if (isStandalone()) {
      setAllowed(true);
      return;
    }

    if (!isMobile()) {
      setPlatform("desktop");
      setAllowed(false);
      return;
    }

    if (isIOS()) {
      setPlatform("ios");
    } else if (isAndroid()) {
      setPlatform("android");
    } else {
      setPlatform("android");
    }
    setAllowed(false);
  }, []);

  // Still detecting
  if (allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Standalone — show full app
  if (allowed) return <>{children}</>;

  // Desktop gate
  if (platform === "desktop") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center font-['Manrope',sans-serif]">
        <img src={eagleLogo} alt="Eagle Amsterdam" className="w-48 mb-8" />
        <Monitor className="w-14 h-14 text-primary mb-4" />
        <h1 className="text-3xl font-extrabold text-foreground mb-3" style={{ letterSpacing: '-0.05em', lineHeight: 1.1 }}>
          Mobile Only
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm leading-relaxed" style={{ letterSpacing: '-0.02em' }}>
          Please visit this link on your mobile device to install the Eagle VIP app.
        </p>
      </div>
    );
  }

  // Mobile browser gate — iOS or Android
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center font-['Manrope',sans-serif]">
      <img src={eagleLogo} alt="Eagle Amsterdam" className="w-48 mb-10" />

      <h1 className="text-3xl font-extrabold text-foreground mb-3" style={{ letterSpacing: '-0.05em', lineHeight: 1.1 }}>
        Install the Eagle App
      </h1>

      <p className="text-muted-foreground text-base mb-10 max-w-xs leading-relaxed" style={{ letterSpacing: '-0.02em' }}>
        To access the full app experience, add it to your home screen.
      </p>

      <div className="w-full max-w-xs space-y-6">
        {platform === "ios" ? (
          <>
            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">1</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  Tap the Share button
                </p>
                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1" style={{ letterSpacing: '-0.02em' }}>
                  Look for the <Share className="inline w-5 h-5 text-primary" /> icon at the bottom of Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">2</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  Select "Add to Home Screen"
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  Scroll down in the menu and tap it
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">3</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  Open from your home screen
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  Tap the Eagle icon to launch the full app
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">1</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  Tap the menu button
                </p>
                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1" style={{ letterSpacing: '-0.02em' }}>
                  Look for the <MoreVertical className="inline w-5 h-5 text-primary" /> icon in your browser
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">2</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  Select "Install app" or "Add to Home screen"
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  Tap the option in the menu
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">3</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  Open from your home screen
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  Tap the Eagle icon to launch the full app
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PwaGate;
