import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-header.webp";
import eagleLogo from "@/assets/eagle-logo-red.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        <img
          src={heroImage}
          alt="Eagle Amsterdam interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center text-center gap-4 animate-fade-in">
          <img
            src={eagleLogo}
            alt="Eagle Amsterdam logo"
            className="w-48 object-contain"
          />
          <h1 className="text-5xl font-display tracking-widest text-foreground text-glow-red">
            EAGLE AMSTERDAM
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            Amsterdam's legendary leather & fetish bar since 1981. Three floors
            of attitude on Warmoesstraat.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary" />
            <span>Warmoesstraat 90, Amsterdam</span>
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

      {/* Info Section */}
      <div className="px-6 py-8 max-w-lg mx-auto w-full">
        <div className="border border-border rounded-lg p-6 bg-card neon-border">
          <h2 className="text-2xl font-display tracking-wider text-foreground mb-3">
            WELCOME
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Eagle Amsterdam is a world-renowned leather and fetish bar located in
            the heart of Amsterdam's red-light district. Spread across three
            floors, we offer a dance floor, cruising area, and darkroom. Whether
            you're a local or visiting from abroad — all men are welcome.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Leather", "Denim", "Fetish", "Bears", "Cruise"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs font-medium tracking-wider uppercase border border-border rounded-full text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
