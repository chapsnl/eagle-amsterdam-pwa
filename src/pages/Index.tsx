import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-header.webp";
import eagleLogo from "@/assets/eagle-logo-white.webp";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col h-[100dvh]">
      {/* Hero background — covers full viewport */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Eagle Amsterdam interior"
          className="absolute inset-0 w-full h-full object-cover"
          width={1024}
          height={768}
          fetchPriority="high"
          decoding="async"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
      </div>

      {/* Content — flex column filling safe area, above nav */}
      <div
        className="relative z-10 flex flex-col flex-1 items-center justify-end animate-fade-in"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex flex-col items-center text-center gap-3 px-6 w-full max-w-lg">
          <img
            src={eagleLogo}
            alt="Eagle Amsterdam logo"
            className="w-48 sm:w-56 object-contain"
            width={192}
            height={96}
            fetchPriority="high"
          />
          <p className="text-muted-foreground text-sm max-w-xs leading-snug">
            Eagle Amsterdam is originally a men-only club and during regular hours that core identity remains. At the same time, we serve the wider LGBTQI+ community with a diverse program of inclusive fetish events.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold">Warmoesstraat 90, Amsterdam</span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full mt-4">
            <Button
              variant="eagle"
              size="lg"
              className="w-full"
              onClick={() => navigate("/agenda")}
            >
              <Calendar className="w-5 h-5 mr-2" />
              UPCOMING EVENTS
            </Button>
            <Button
              variant="eagle-outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/contact")}
            >
              <MapPin className="w-5 h-5 mr-2" />
              FIND US
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
