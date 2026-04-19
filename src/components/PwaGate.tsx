import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Share, MoreVertical, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import eagleLogo from "@/assets/eagle-logo-white.webp";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) ||
    isIPadOS()
  );
}

function isIPadOS(): boolean {
  // iPadOS 13+ reports as Mac in user agent but has touch support
  return (
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1 &&
    !(window as any).MSStream
  );
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function isMobileOrTablet(): boolean {
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    isIPadOS()
  );
}

type Platform = "ios" | "android" | "desktop";

const BYPASS_PATHS = ["/eagle-admin-dashboard"];
const BYPASS_HOSTS = ["admin.eagleamsterdam.com"];

function isLovablePreview(): boolean {
  const host = window.location.hostname;
  // Lovable in-editor preview iframes (id-preview--*.lovable.app) and sandbox dev hosts.
  // The published app (eagle-app.lovable.app) and custom domain are NOT bypassed.
  return (
    /^id-preview--.*\.lovable\.app$/.test(host) ||
    host.endsWith(".sandbox.lovable.dev") ||
    host.endsWith(".lovableproject.com")
  );
}

const PwaGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");

  // Use both React Router location and window.location for reliability
  const isBypassRoute = BYPASS_HOSTS.includes(window.location.hostname) ||
    isLovablePreview() ||
    BYPASS_PATHS.some((p) =>
      location.pathname.startsWith(p) || window.location.pathname.startsWith(p)
    );

  const t = useMemo(() => {
    const lang = navigator.language || "en";
    return getTranslations(lang);
  }, []);

  useEffect(() => {
    if (isBypassRoute) {
      setAllowed(true);
      return;
    }
    if (isStandalone()) {
      setAllowed(true);
      return;
    }

    if (!isMobileOrTablet()) {
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
  }, [isBypassRoute]);

  // Bypass for admin routes - immediate, no waiting
  if (isBypassRoute) return <>{children}</>;

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
        <Monitor className="w-20 h-20 text-primary mb-5" />
        <h1 className="text-2xl font-extrabold text-foreground mb-3" style={{ letterSpacing: '-0.05em', lineHeight: 1.1 }}>
          {t.mobileOnly}
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed" style={{ letterSpacing: '-0.02em' }}>
          {t.mobileOnlyDesc}
        </p>
      </div>
    );
  }

  // Mobile browser gate — iOS or Android
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center font-['Manrope',sans-serif]">
      <img src={eagleLogo} alt="Eagle Amsterdam" className="w-48 mb-10" />

      <h1 className="text-2xl font-extrabold text-foreground mb-3" style={{ letterSpacing: '-0.05em', lineHeight: 1.1 }}>
        {t.installTitle}
      </h1>

      <p className="text-muted-foreground text-sm mb-10 max-w-xs leading-relaxed" style={{ letterSpacing: '-0.02em' }}>
        {t.installDesc}
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
                  {t.step1TitleIos}
                </p>
                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1" style={{ letterSpacing: '-0.02em' }}>
                  {t.step1DescIos} <Share className="inline w-7 h-7 text-primary" />
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">2</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  {t.step2TitleIos}
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  {t.step2DescIos}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">3</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  {t.step3Title}
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  {t.step3Desc}
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
                  {t.step1TitleAndroid}
                </p>
                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1" style={{ letterSpacing: '-0.02em' }}>
                  {t.step1DescAndroid} <MoreVertical className="inline w-7 h-7 text-primary" />
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">2</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  {t.step2TitleAndroid}
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  {t.step2DescAndroid}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="shrink-0 w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-extrabold text-xl">3</span>
              </div>
              <div>
                <p className="text-foreground font-bold text-base" style={{ letterSpacing: '-0.03em' }}>
                  {t.step3Title}
                </p>
                <p className="text-muted-foreground text-sm mt-1" style={{ letterSpacing: '-0.02em' }}>
                  {t.step3Desc}
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
