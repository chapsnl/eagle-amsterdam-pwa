import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import eagleWatermark from "@/assets/eagle-watermark.png";

interface VoucherCardProps {
  title: string;
  description?: string | null;
  expiresAt?: string | null;
  redeemed?: boolean;
  onRedeem?: () => void;
}

const VoucherCard = ({ title, description, expiresAt, redeemed, onRedeem }: VoucherCardProps) => {
  return (
    <div className="space-y-2">
      <div
        className={`relative w-full rounded-xl p-5 overflow-hidden ${redeemed ? "opacity-50" : ""}`}
        style={{
          background: "linear-gradient(135deg, hsl(5 64% 43%), hsl(5 64% 33%))",
          aspectRatio: "1.586",
        }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)",
        }} />

        {/* Eagle Amsterdam watermark */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${eagleWatermark})`,
            backgroundSize: "cover",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Top row: redeem button left, gift icon right */}
          <div className="flex items-start justify-between">
            <div>
              {!redeemed && onRedeem ? (
                <Button
                  size="sm"
                  className="border border-background bg-[hsl(5_64%_30%)] text-primary-foreground hover:bg-[hsl(5_64%_25%)] text-xs tracking-[-0.02em] font-bold"
                  onClick={onRedeem}
                >
                  <Gift className="w-3.5 h-3.5 mr-1.5" />
                  REDEEM
                </Button>
              ) : (
                expiresAt && !redeemed && (
                  <span className="text-primary-foreground/60 text-[10px] tracking-wide">
                    EXP {new Date(expiresAt).toLocaleDateString()}
                  </span>
                )
              )}
            </div>
            {/* Large blinking gift icon on the right */}
            <div className="w-[84px] h-[84px] rounded-full flex items-center justify-center animate-[pulse_1.2s_ease-in-out_infinite]" style={{ backgroundColor: "hsl(5 64% 30%)" }}>
              <Gift className="w-[58px] h-[58px] text-primary-foreground" />
            </div>
          </div>

          {/* Title & description */}
          <div className="flex-1 flex flex-col justify-center py-1">
            <h3 className="text-primary-foreground text-[24px] font-extrabold tracking-[-0.05em] leading-tight uppercase">
              {title}
            </h3>
            {description && (
              <p className="text-primary-foreground/80 text-xs tracking-[-0.02em] mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <span className="text-primary-foreground/40 text-[10px] font-bold tracking-widest uppercase">
              {redeemed ? "Redeemed" : "Eagle Amsterdam"}
            </span>
            {expiresAt && !redeemed && (
              <span className="text-primary-foreground/60 text-[10px] tracking-wide">
                EXP {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Warning text below — only for active vouchers */}
      {!redeemed && onRedeem && (
        <p className="text-foreground text-xs text-center tracking-[-0.02em]">
          Do not press redeem — the bartender will do that for you. Otherwise, your voucher will disappear.
        </p>
      )}
    </div>
  );
};

export default VoucherCard;
