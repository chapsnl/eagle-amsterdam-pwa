import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-header.webp";
import eagleLogo from "@/assets/eagle-logo-white.webp";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[100dvh] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      {/* Hero Section — fills remaining space */}
      <div className="relative flex-1 w-full overflow-hidden">
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
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center text-center gap-3 animate-fade-in">
          <img
            src={eagleLogo}
            alt="Eagle Amsterdam logo"
            className="w-56 sm:w-64 object-contain"
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
        </div>
      </div>

      {/* Quick Actions — fixed height, always visible above nav */}
      <div className="px-6 py-4 flex flex-col gap-3 max-w-lg mx-auto w-full shrink-0">
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
  );
};

export default Index;
