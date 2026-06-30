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
type Lang = "nl" | "de" | "fr" | "es" | "it" | "pt" | "en";

const TRANSLATIONS: Record<Lang, { title: string; instr1: string; instr2: string; close: string }> = {
  nl: { title: "Voeg Eagle toe aan je beginscherm", instr1: "Tik op delen", instr2: "en kies 'Zet op beginscherm'", close: "Sluiten" },
  de: { title: "Eagle zum Startbildschirm hinzufügen", instr1: "Tippe auf Teilen", instr2: "und wähle 'Zum Home-Bildschirm'", close: "Schließen" },
  fr: { title: "Ajouter Eagle à l'écran d'accueil", instr1: "Appuyez sur partager", instr2: "et choisissez 'Sur l'écran d'accueil'", close: "Fermer" },
  es: { title: "Añade Eagle a la pantalla de inicio", instr1: "Toca compartir", instr2: "y elige 'Añadir a pantalla de inicio'", close: "Cerrar" },
  it: { title: "Aggiungi Eagle alla schermata Home", instr1: "Tocca condividi", instr2: "e scegli 'Aggiungi a Home'", close: "Chiudi" },
  pt: { title: "Adicionar Eagle ao ecrã principal", instr1: "Toque em partilhar", instr2: "e escolha 'Adicionar ao Ecrã Principal'", close: "Fechar" },
  en: { title: "Add Eagle to your home screen", instr1: "Tap share", instr2: "and choose 'Add to Home Screen'", close: "Close" },
};

function detectLang(): Lang {
  const langs = [
    ...(navigator.languages || []),
    navigator.language || "",
  ].map((l) => l.toLowerCase().split("-")[0]);
  for (const l of langs) {
    if (l in TRANSLATIONS) return l as Lang;
  }
  return "en";
}

const IOSInstallBanner = () => {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(TRANSLATIONS.en);

  useEffect(() => {
    if (!isIOSSafari() || isStandalone()) return;
    if (!shouldShow()) return;
    setT(TRANSLATIONS[detectLang()]);
    const timer = setTimeout(() => setOpen(true), 50);
    return () => clearTimeout(timer);
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
              {t.title}
            </p>
            <p
              className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1 flex-wrap"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t.instr1}{" "}
              <Share className="inline w-3.5 h-3.5 text-primary" /> {t.instr2}
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label={t.close}
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
