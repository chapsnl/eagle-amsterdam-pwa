import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
const heroImage = "https://www.eagleamsterdam.com/wp-content/uploads/2025/12/Header-3b-copy.webp";
import eagleLogo from "@/assets/eagle-logo-white.webp";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen pb-36">
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
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center text-center gap-4 animate-fade-in">
          <img
            src={eagleLogo}
            alt="Eagle Amsterdam logo"
            className="w-64 object-contain"
            width={192}
            height={96}
            fetchPriority="high"
          />
          <p className="text-muted-foreground text-sm max-w-xs">
            Eagle Amsterdam is originally a men-only club and during regular hours that core identity remains. At the same time, we serve the wider LGBTQI+ community with a diverse program of inclusive fetish events.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold">Warmoesstraat 90, Amsterdam</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
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
