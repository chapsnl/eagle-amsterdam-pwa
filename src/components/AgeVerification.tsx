import { useState } from "react";
import { Button } from "@/components/ui/button";
import eagleLogo from "@/assets/eagle-logo.png";
import heroImage from "@/assets/hero-header.webp";

interface AgeVerificationProps {
  onVerified: () => void;
}

const AgeVerification = ({ onVerified }: AgeVerificationProps) => {
  const [exiting, setExiting] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      sessionStorage.setItem("eagle-age-verified", "true");
      onVerified();
    }, 400);
  };

  const handleDecline = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-end bg-background transition-opacity duration-400 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      <img
        src={heroImage}
        alt="Eagle Amsterdam"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)) 15%, hsl(var(--background) / 0.85) 40%, transparent 70%)" }} />
      <div className="relative flex flex-col items-center gap-6 px-6 pb-12 text-center max-w-sm">
        <img
          src={eagleLogo}
          alt="Eagle Amsterdam"
          className="w-20 h-20 object-contain"
        />
        <h1 className="text-4xl font-display tracking-wider text-foreground">
          EAGLE AMSTERDAM
        </h1>
        <div className="w-16 h-0.5 bg-primary" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          This venue and its content are intended for adults only. By entering,
          you confirm that you are at least 18 years of age.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Button variant="eagle" size="lg" onClick={handleEnter} className="w-full">
            I AM 18 OR OLDER — ENTER
          </Button>
          <Button variant="eagle-outline" size="lg" onClick={handleDecline} className="w-full">
            I AM UNDER 18 — LEAVE
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Warmoesstraat 90, Amsterdam
        </p>
      </div>
    </div>
  );
};

export default AgeVerification;
