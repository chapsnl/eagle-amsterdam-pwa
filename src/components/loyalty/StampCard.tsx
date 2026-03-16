import { memo } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOTAL_STAMPS = 9;

interface StampCardProps {
  stamps: number;
  onRewardOpen: () => void;
}

const StampCard = memo(({ stamps, onRewardOpen }: StampCardProps) => {
  const isComplete = stamps >= TOTAL_STAMPS;

  if (isComplete) {
    return (
      <div className="relative rounded-2xl border-2 border-primary p-8 text-center neon-border">
        <Gift className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse-red" />
        <h2 className="text-2xl text-foreground mb-2">CONGRATS!</h2>
        <Button variant="eagle" size="lg" className="w-full text-base py-4" onClick={onRewardOpen}>
          <Gift className="w-5 h-5 mr-2" />
          Redeem reward
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid grid-cols-3 gap-3 mb-2">
        {Array.from({ length: TOTAL_STAMPS }).map((_, i) => {
          const filled = i < stamps;
          return (
            <div
              key={i}
              className={`aspect-square rounded-full flex items-center justify-center transition-all duration-300 ${
                filled
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-red)]"
                  : "bg-secondary text-muted-foreground border-2 border-border"
              }`}
            >
              {filled ? (
                <svg viewBox="0 0 32 32" fill="currentColor" className="w-9 h-9">
                  {/* Shaft */}
                  <rect x="13" y="4" width="6" height="18" rx="3" />
                  {/* Head */}
                  <ellipse cx="16" cy="4" rx="4.2" ry="3.2" />
                  {/* Left ball */}
                  <circle cx="12.5" cy="25.5" r="4" />
                  {/* Right ball */}
                  <circle cx="19.5" cy="25.5" r="4" />
                </svg>
              ) : (
                <span className="text-base font-bold tracking-[-0.02em]">{i + 1}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-muted-foreground text-sm mt-4">
        {stamps} / {TOTAL_STAMPS} tokens collected
      </p>
    </div>
  );
});

StampCard.displayName = "StampCard";

export default StampCard;
