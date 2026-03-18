import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
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

interface Translations {
  mobileOnly: string;
  mobileOnlyDesc: string;
  installTitle: string;
  installDesc: string;
  step1TitleIos: string;
  step1DescIos: string;
  step1TitleAndroid: string;
  step1DescAndroid: string;
  step2TitleIos: string;
  step2DescIos: string;
  step2TitleAndroid: string;
  step2DescAndroid: string;
  step3Title: string;
  step3Desc: string;
}

function getTranslations(lang: string): Translations {
  const l = lang.toLowerCase().slice(0, 2);

  if (l === "nl") return {
    mobileOnly: "Alleen Mobiel",
    mobileOnlyDesc: "Open deze link op je telefoon om de Eagle VIP app te installeren.",
    installTitle: "Installeer de Eagle App",
    installDesc: "Voeg de app toe aan je startscherm voor de volledige ervaring.",
    step1TitleIos: "Tik op de Deel-knop",
    step1DescIos: "Zoek het icoon onderaan Safari. Soms zit de deelknop verstopt achter de 3 puntjes",
    step1TitleAndroid: "Tik op de menuknop",
    step1DescAndroid: "Zoek het icoon in je browser. Soms zit de deelknop verstopt achter de 3 puntjes",
    step2TitleIos: "Kies \"Zet op beginscherm\"",
    step2DescIos: "Scroll naar beneden in het menu en tik erop",
    step2TitleAndroid: "Kies \"App installeren\" of \"Toevoegen aan startscherm\"",
    step2DescAndroid: "Tik op de optie in het menu",
    step3Title: "Open de app vanaf je telefoon",
    step3Desc: "Tik op het Eagle-icoon op je startscherm om de app te openen",
  };

  if (l === "de") return {
    mobileOnly: "Nur Mobil",
    mobileOnlyDesc: "Bitte öffne diesen Link auf deinem Handy, um die Eagle VIP App zu installieren.",
    installTitle: "Eagle App installieren",
    installDesc: "Füge die App zu deinem Startbildschirm hinzu.",
    step1TitleIos: "Tippe auf das Teilen-Symbol",
    step1DescIos: "Suche das Symbol unten in Safari. Manchmal ist der Teilen-Button hinter den 3 Punkten versteckt",
    step1TitleAndroid: "Tippe auf die Menü-Taste",
    step1DescAndroid: "Suche das Symbol in deinem Browser. Manchmal ist der Teilen-Button hinter den 3 Punkten versteckt",
    step2TitleIos: 'W\u00e4hle \u201eZum Home-Bildschirm\u201c',
    step2DescIos: "Scrolle im Men\u00fc nach unten und tippe darauf",
    step2TitleAndroid: 'W\u00e4hle \u201eApp installieren\u201c oder \u201eZum Startbildschirm hinzuf\u00fcgen\u201c',
    step2DescAndroid: "Tippe auf die Option im Menü",
    step3Title: "Öffne die App von deinem Handy",
    step3Desc: "Tippe auf das Eagle-Symbol auf deinem Startbildschirm",
  };

  if (l === "fr") return {
    mobileOnly: "Mobile uniquement",
    mobileOnlyDesc: "Ouvrez ce lien sur votre téléphone pour installer l'application Eagle VIP.",
    installTitle: "Installer l'application Eagle",
    installDesc: "Ajoutez l'application à votre écran d'accueil pour l'expérience complète.",
    step1TitleIos: "Appuyez sur le bouton Partager",
    step1DescIos: "Cherchez l'icône en bas de Safari. Parfois le bouton de partage est caché derrière les 3 points",
    step1TitleAndroid: "Appuyez sur le bouton menu",
    step1DescAndroid: "Cherchez l'icône dans votre navigateur. Parfois le bouton est caché derrière les 3 points",
    step2TitleIos: "Sélectionnez « Sur l'écran d'accueil »",
    step2DescIos: "Faites défiler le menu et appuyez dessus",
    step2TitleAndroid: "Sélectionnez « Installer l'appli » ou « Ajouter à l'écran d'accueil »",
    step2DescAndroid: "Appuyez sur l'option dans le menu",
    step3Title: "Ouvrez l'app depuis votre téléphone",
    step3Desc: "Appuyez sur l'icône Eagle sur votre écran d'accueil",
  };

  if (l === "es") return {
    mobileOnly: "Solo Móvil",
    mobileOnlyDesc: "Abre este enlace en tu teléfono para instalar la app Eagle VIP.",
    installTitle: "Instalar la app Eagle",
    installDesc: "Añade la app a tu pantalla de inicio para la experiencia completa.",
    step1TitleIos: "Toca el botón Compartir",
    step1DescIos: "Busca el icono en la parte inferior de Safari. A veces el botón de compartir está oculto detrás de los 3 puntos",
    step1TitleAndroid: "Toca el botón de menú",
    step1DescAndroid: "Busca el icono en tu navegador. A veces el botón está oculto detrás de los 3 puntos",
    step2TitleIos: "Selecciona \"Añadir a pantalla de inicio\"",
    step2DescIos: "Desplázate en el menú y tócalo",
    step2TitleAndroid: "Selecciona \"Instalar app\" o \"Añadir a pantalla de inicio\"",
    step2DescAndroid: "Toca la opción en el menú",
    step3Title: "Abre la app desde tu teléfono",
    step3Desc: "Toca el icono Eagle en tu pantalla de inicio",
  };

  if (l === "pt") return {
    mobileOnly: "Apenas Mobile",
    mobileOnlyDesc: "Abra este link no seu telemóvel para instalar a app Eagle VIP.",
    installTitle: "Instalar a app Eagle",
    installDesc: "Adicione a app ao ecrã inicial para a experiência completa.",
    step1TitleIos: "Toque no botão Partilhar",
    step1DescIos: "Procure o ícone na parte inferior do Safari. Por vezes o botão de partilha está escondido atrás dos 3 pontos",
    step1TitleAndroid: "Toque no botão de menu",
    step1DescAndroid: "Procure o ícone no seu navegador. Por vezes o botão está escondido atrás dos 3 pontos",
    step2TitleIos: "Selecione \"Adicionar ao ecrã inicial\"",
    step2DescIos: "Deslize no menu e toque",
    step2TitleAndroid: "Selecione \"Instalar app\" ou \"Adicionar ao ecrã inicial\"",
    step2DescAndroid: "Toque na opção no menu",
    step3Title: "Abra a app a partir do seu telemóvel",
    step3Desc: "Toque no ícone Eagle no seu ecrã inicial",
  };

  // Default: English
  return {
    mobileOnly: "Mobile Only",
    mobileOnlyDesc: "Please visit this link on your mobile device to install the Eagle VIP app.",
    installTitle: "Install the Eagle App",
    installDesc: "To access the full app experience, add it to your home screen.",
    step1TitleIos: "Tap the Share button",
    step1DescIos: "Look for the icon at the bottom of Safari. Sometimes the share button is hidden under the 3 dots",
    step1TitleAndroid: "Tap the menu button",
    step1DescAndroid: "Look for the icon in your browser. Sometimes the share button is hidden under the 3 dots",
    step2TitleIos: "Select \"Add to Home Screen\"",
    step2DescIos: "Scroll down in the menu and tap it",
    step2TitleAndroid: "Select \"Install app\" or \"Add to Home screen\"",
    step2DescAndroid: "Tap the option in the menu",
    step3Title: "Open the app from your phone",
    step3Desc: "Tap the Eagle icon on your home screen to launch the app",
  };
}

const BYPASS_PATHS = ["/eagle-admin-dashboard"];

const PwaGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");

  const isBypassRoute = BYPASS_PATHS.some((p) => location.pathname.startsWith(p));

  // Bypass PWA gate for admin routes
  if (isBypassRoute) return <>{children}</>;

  const t = useMemo(() => {
    const lang = navigator.language || "en";
    return getTranslations(lang);
  }, []);

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
