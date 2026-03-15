import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Star, Tag, Newspaper, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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

  const handleLogout = async () => {
    localStorage.removeItem("vip_session");
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    navigate("/vip/login");
  };

  if (!session) return null;

  const menuItems = [
    {
      label: "LOYALTY CARD",
      icon: Star,
      onClick: () => navigate("/vip/loyalty"),
    },
    {
      label: "MEMBER DEALS",
      icon: Tag,
      onClick: () => toast.info("Coming soon!"),
    },
    {
      label: "PRIVATE NEWS",
      icon: Newspaper,
      onClick: () => toast.info("Coming soon!"),
    },
    {
      label: "LOGOUT",
      icon: LogOut,
      onClick: handleLogout,
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
          {menuItems.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="aspect-square flex flex-col items-center justify-center gap-3 bg-primary text-primary-foreground rounded-none border-0 transition-all duration-200 active:scale-95 hover:opacity-90"
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
