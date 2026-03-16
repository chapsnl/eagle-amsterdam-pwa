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
        <p className="text-foreground text-sm mb-6">
          <strong>Collect 9 tokens to receive one free entry to an Eagle Amsterdam organized event.</strong>
        </p>
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
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
                  <path d="M12 2c-1.5 0-2.5 1.2-2.5 3v11c0 0.5-0.3 1-0.8 1.3C7.5 18 7 19.2 7 20.5 7 22 9.2 23 12 23s5-1 5-2.5c0-1.3-0.5-2.5-1.7-3.2-0.5-0.3-0.8-0.8-0.8-1.3V5c0-1.8-1-3-2.5-3z" />
                  <ellipse cx="12" cy="3.5" rx="3.2" ry="2.5" />
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
