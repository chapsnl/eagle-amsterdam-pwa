import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Star, Tag, Newspaper, IdCard } from "lucide-react";

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
        setSession(JSON.parse(stored));
      } catch {
        navigate("/vip/login");
      }
    } else {
      navigate("/vip/login");
    }
  }, [navigate]);


  if (!session) return null;

  const menuItems = [
    {
      label: "LOYALTY CARD",
      icon: Star,
      onClick: () => navigate("/vip/loyalty"),
      disabled: false,
    },
    {
      label: "MEMBER DEALS",
      icon: Tag,
      onClick: undefined,
      disabled: true,
    },
    {
      label: "PRIVATE NEWS",
      icon: Newspaper,
      onClick: undefined,
      disabled: true,
    },
    {
      label: "MEMBER PASS",
      icon: IdCard,
      onClick: () => navigate("/vip/member-pass"),
      disabled: false,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-[90%] mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <Crown className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-3xl text-foreground">VIP AREA</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, <strong className="text-foreground">{session.name}</strong>
          </p>
        </div>

        {/* 4-button grid */}
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map(({ label, icon: Icon, onClick, disabled }) => (
            <button
              key={label}
              onClick={disabled ? undefined : onClick}
              disabled={disabled}
              className={`relative aspect-square flex flex-col items-center justify-center gap-3 rounded-none border-0 transition-all duration-200 overflow-hidden ${
                disabled
                  ? "bg-primary/30 text-primary-foreground/40 cursor-not-allowed"
                  : "bg-primary text-primary-foreground active:scale-95 hover:opacity-90"
              }`}
            >
              {disabled && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute bg-primary-foreground/20" style={{ width: '150%', height: '24px', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }} />
                </div>
              )}
              <Icon className="w-10 h-10" />
              <span className="text-sm font-bold tracking-wide">{label}</span>
            </button>
          ))}
        </div>
        {/* Empty placeholder for the removed 4th button — keeps grid balanced */}
        
      </div>
    </div>
  );
};

export default VipDashboard;
