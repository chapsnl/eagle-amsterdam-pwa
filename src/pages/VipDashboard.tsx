import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Star, Tag, Info, IdCard, DoorOpen } from "lucide-react";
import { calculateVipStatus, trackAppOpen, type VipStatusLevel } from "@/lib/vipStatus";
import { useProfile } from "@/hooks/useProfile";
import { useMemberVouchers } from "@/hooks/useMemberVouchers";

interface VipSession {
  userId: string;
  email: string;
  name: string;
  verified: boolean;
}

const VipDashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<VipSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        trackAppOpen();
      } catch {
        navigate("/vip/login");
      }
    } else {
      navigate("/vip/login");
    }
  }, [navigate]);

  // Shared cached fetches — dedupe across pages, no extra round trips
  const { data: profile } = useProfile();
  const { data: vouchers } = useMemberVouchers();

  const vipStatus: VipStatusLevel = profile
    ? calculateVipStatus(profile.total_stamps_earned || 0)
    : "Regular";
  const hasActiveVouchers = (vouchers || []).some((v) => !v.redeemed);

  if (!session) return null;

  const memberDealsDisabled = !hasActiveVouchers;

  const menuItems = [
    {
      label: "LOYALTY CARD",
      icon: Star,
      onClick: () => navigate("/vip/loyalty"),
      disabled: false,
      isDeal: false,
    },
    {
      label: "MEMBER DEALS",
      icon: Tag,
      onClick: hasActiveVouchers ? () => navigate("/vip/member-deals") : undefined,
      disabled: memberDealsDisabled,
      isDeal: true,
    },
    {
      label: "INFO",
      icon: Info,
      onClick: () => navigate("/vip/info"),
      disabled: false,
      isDeal: false,
    },
    {
      label: "MEMBER PASS",
      icon: IdCard,
      onClick: () => navigate("/vip/member-pass"),
      disabled: false,
      isDeal: false,
    },
    {
      label: "BACKROOM",
      icon: DoorOpen,
      onClick: () => navigate("/vip/backroom"),
      disabled: false,
      isDeal: false,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <Crown className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-3xl text-foreground">VIP AREA</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, <strong className="text-foreground">{session.name}</strong>
          </p>
          <div className="inline-flex items-center gap-2 bg-secondary rounded-lg px-4 py-1.5 mt-2">
            <Star className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground text-xs font-bold tracking-wide">{vipStatus}</span>
          </div>
        </div>

        {/* 4-button grid */}
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map(({ label, icon: Icon, onClick, disabled }) => (
            <button
              key={label}
              onClick={disabled ? undefined : onClick}
              disabled={disabled}
              className={`py-5 flex flex-col items-center justify-center gap-2 rounded-xl border-0 transition-all duration-200 ${
                disabled
                  ? "bg-primary/30 text-primary-foreground/40 cursor-not-allowed"
                  : "bg-primary text-primary-foreground active:scale-95 hover:opacity-90"
              }`}
            >
              <Icon className="w-10 h-10" />
              <span className="text-sm font-bold tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VipDashboard;
