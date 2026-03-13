import { useState } from "react";
import { Button } from "@/components/ui/button";
import eagleLogo from "@/assets/eagle-logo.png";

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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-400 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center max-w-sm">
        <img
          src={eagleLogo}
          alt="Eagle Amsterdam"
          className="w-24 h-24 object-contain"
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
