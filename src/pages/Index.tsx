import { Calendar, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPrompt from "@/components/InstallPrompt";
import IOSInstallBanner from "@/components/IOSInstallBanner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
const heroImage = "https://www.eagleamsterdam.com/wp-content/uploads/2025/12/Header-3b-copy.webp";
import eagleLogo from "@/assets/eagle-logo-white.webp";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Settings gear */}
      <button
        onClick={() => navigate("/settings")}
        className="fixed top-[66px] right-4 z-50 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        aria-label={t("home.settings")}
      >
        <Settings className="w-5 h-5 text-primary-foreground" />
      </button>

      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        <img
          src={heroImage}
          alt="Eagle Amsterdam interior"
          className="absolute inset-0 w-full h-full object-cover"
          width={1024}
          height={768}
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center text-center gap-4 animate-fade-in">
          <img src={eagleLogo} alt="Eagle Amsterdam logo" className="w-64 object-contain" width={192} height={96} fetchPriority="high" />
          <p className="text-muted-foreground text-sm max-w-xs">
            {t("home.intro")}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold">{t("home.address")}</span>
          </div>
        </div>
      </div>

      <div className="p-6 pb-0 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <Button variant="eagle" size="lg" className="w-full" onClick={() => navigate("/agenda")}>
          <Calendar className="w-5 h-5 mr-2" />
          {t("home.upcomingEvents")}
        </Button>
      </div>
      <InstallPrompt />
      <IOSInstallBanner />
    </div>
  );
};

export default Index;
