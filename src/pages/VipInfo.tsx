import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Star, Gift, ShieldCheck } from "lucide-react";

const VIP_INFO_SEEN_KEY = "eagle_vip_info_seen";

const VipInfo = () => {
  const navigate = useNavigate();
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) navigate("/vip/login");
  }, [navigate]);

  useEffect(() => {
    const seen = localStorage.getItem(VIP_INFO_SEEN_KEY);
    if (!seen) {
      setShowBonus(true);
      localStorage.setItem(VIP_INFO_SEEN_KEY, "1");
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-[90%] mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Info className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl text-foreground">VIP INFO</h1>
          <p className="text-muted-foreground text-xs">
            Everything you need to know about your VIP membership
          </p>
        </div>

        {/* Loyalty Program */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">Loyalty Program</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            As a VIP member, you save points for <strong className="text-foreground">free access</strong> to major Eagle Amsterdam events such as <strong className="text-foreground">NcAdam</strong>, <strong className="text-foreground">Horsemen & Knights</strong>, and <strong className="text-foreground">Cum Hunks</strong>.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Collect <strong className="text-foreground">9 tokens</strong> to receive one free entry to an Eagle organized event.
          </p>
          {showBonus && (
            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-foreground text-sm font-bold leading-snug">
                Since you've joined, you've received 1 token as a gift! Scan your second token during an event — only 7 more to go!
              </p>
            </div>
          )}
        </div>

        {/* Member Deals */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">Member Deals</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Unlock Member Deals: Get automatic vouchers for free cloakroom, drinks, or event entry. Rewards are added every time your status levels up. Plus, we drop surprise vouchers for everyone! Check your Member Deals regularly so you don't miss out!
          </p>
        </div>

        {/* Status Levels */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">VIP Status Levels</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your status level increases based on your total stamps earned:
          </p>
          <div className="space-y-2">
            {/* Regular */}
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ backgroundColor: "#b43227" }}>
              <div>
                <p className="text-white text-sm font-bold">Regular</p>
                <p className="text-white/70 text-xs">Starting level</p>
              </div>
              <span className="text-white text-xs font-semibold">1–9 stamps</span>
            </div>

            {/* Cruiser */}
            <div className="flex flex-col rounded-lg px-4 py-3" style={{ backgroundColor: "#1a5c2a" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-bold">Cruiser</p>
                  <p className="text-white/70 text-xs">Active member</p>
                </div>
                <span className="text-white text-xs font-semibold">10–24 stamps</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
                <p className="text-white/80 text-xs leading-relaxed">
                  Grants Fast-Lane access. Your Member Pass turns <strong className="text-white">Green</strong>.
                </p>
              </div>
            </div>

            {/* Party Boy */}
            <div className="flex flex-col rounded-lg px-4 py-3" style={{ backgroundColor: "#1a3a6b" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-bold">Party Boy</p>
                  <p className="text-white/70 text-xs">Dedicated regular</p>
                </div>
                <span className="text-white text-xs font-semibold">25–49 stamps</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
                <p className="text-white/80 text-xs leading-relaxed">
                  Priority access and guaranteed entry during Pride events without waiting and Fast-Lane access. Your Member Pass turns <strong className="text-white">Blue</strong>.
                </p>
              </div>
            </div>

            {/* Slut */}
            <div className="flex flex-col rounded-lg px-4 py-3" style={{ backgroundColor: "#333333", border: "3px solid #b43227" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-bold">Slut</p>
                  <p className="text-white/70 text-xs">Ultimate VIP</p>
                </div>
                <span className="text-white text-xs font-semibold">50+ stamps</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
                <p className="text-white/80 text-xs leading-relaxed">
                  Your Member Pass turns <strong className="text-white">Dark Grey</strong>. You get free access during All Prides and Kings Night, Free Coat Check at all times and always priority and Fast-Lane access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipInfo;
