import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, Crown } from "lucide-react";

interface VipSession {
  userId: string;
  email: string;
  name: string;
  verified: boolean;
}

const VipMemberPass = () => {
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

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-[90%] mx-auto w-full">
        <div className="text-center mb-8 space-y-2">
          <IdCard className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-3xl text-foreground">MEMBER PASS</h1>
          <p className="text-muted-foreground text-sm">
            Your digital VIP membership card
          </p>
        </div>

        <div className="border border-border bg-secondary/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg">VIP MEMBER</span>
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-bold text-xl">{session.name}</p>
            <p className="text-muted-foreground text-sm">{session.email}</p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Status: Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipMemberPass;
