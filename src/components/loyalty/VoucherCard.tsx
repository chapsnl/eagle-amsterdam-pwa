import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoucherCardProps {
  title: string;
  description?: string | null;
  expiresAt?: string | null;
  redeemed?: boolean;
  onRedeem?: () => void;
}

const VoucherCard = ({ title, description, expiresAt, redeemed, onRedeem }: VoucherCardProps) => {
  return (
    <div className="space-y-3">
      {/* Credit-card style voucher */}
      <div
        className={`relative w-full rounded-xl p-5 overflow-hidden ${
          redeemed ? "opacity-50" : ""
        }`}
        style={{
          background: "linear-gradient(135deg, hsl(5 64% 43%), hsl(5 64% 33%))",
          aspectRatio: "1.586",
        }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)",
        }} />

        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Top row: blinking gift icon */}
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center animate-[pulse_1.2s_ease-in-out_infinite]" style={{ backgroundColor: "hsl(5 64% 30%)" }}>
              <Gift className="w-6 h-6 text-primary-foreground" />
            </div>
            {expiresAt && !redeemed && (
              <span className="text-primary-foreground/60 text-[10px] tracking-wide">
                EXP {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 flex flex-col justify-center py-2">
            <h3 className="text-primary-foreground text-xl font-extrabold tracking-[-0.05em] leading-tight uppercase">
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
              Eagle Amsterdam
            </span>
            <span className="text-primary-foreground/40 text-[10px] font-bold tracking-widest uppercase">
              {redeemed ? "Redeemed" : "Gift Voucher"}
            </span>
          </div>
        </div>
      </div>

      {/* Redeem button & warning — only for active vouchers */}
      {!redeemed && onRedeem && (
        <>
          <Button
            variant="eagle"
            size="lg"
            className="w-full tracking-[-0.02em]"
            onClick={onRedeem}
          >
            <Gift className="w-5 h-5 mr-2" />
            REDEEM GIFT CARD
          </Button>
          <p className="text-primary/80 text-xs text-center tracking-[-0.02em] italic font-semibold">
            ⚠️ Do not press redeem — the bartender will do that for you. You may lose your voucher.
          </p>
        </>
      )}
    </div>
  );
};

export default VoucherCard;
