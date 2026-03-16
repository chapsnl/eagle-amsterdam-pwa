import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Star, Gift, Ticket, Crown } from "lucide-react";

const VipInfo = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) navigate("/vip/login");
  }, [navigate]);

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
            As a VIP member, you save points for <strong className="text-foreground">free access</strong> to major Eagle Amsterdam events such as <strong className="text-foreground">McAdam</strong>, <strong className="text-foreground">Horsemen & Knights</strong>, and <strong className="text-foreground">Cum Hunks</strong>.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Collect <strong className="text-foreground">9 stamps</strong> to receive one free entry to an Eagle organized event.
          </p>
          <div className="bg-primary/10 border border-primary rounded-lg p-4">
            <p className="text-foreground text-sm font-bold leading-snug">
              Since you've joined, you've received 1 stamp as a gift! Scan your second stamp during an event — only 7 more to go!
            </p>
          </div>
        </div>

        {/* Member Deals */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">Member Deals</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vouchers for app users include:
          </p>
          <ul className="text-muted-foreground text-sm space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <Ticket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>Free access to selected events</span>
            </li>
            <li className="flex items-start gap-2">
              <Ticket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>A welcome drink on your first visit</span>
            </li>
            <li className="flex items-start gap-2">
              <Ticket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>A free wardrobe item</span>
            </li>
          </ul>
        </div>

        {/* Member Pass Perks */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">Member Pass Perks</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your VIP Member Pass gives you exclusive perks:
          </p>
          <ul className="text-muted-foreground text-sm space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">→</span>
              <span><strong className="text-foreground">Fast-track access</strong> during World Pride — no waiting, guaranteed entry</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">→</span>
              <span><strong className="text-foreground">Priority entry</strong> during Kings Night — skip the line</span>
            </li>
          </ul>
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
            {[
              { level: "Regular", desc: "Starting level", threshold: "0+ stamps" },
              { level: "Cruiser", desc: "Active member", threshold: "27+ stamps or 15 weekly visits" },
              { level: "Party Boy", desc: "Dedicated regular", threshold: "36+ stamps" },
              { level: "Slut", desc: "Ultimate VIP", threshold: "50+ stamps" },
            ].map(({ level, desc, threshold }) => (
              <div key={level} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-bold">{level}</p>
                  <p className="text-muted-foreground text-xs">{desc}</p>
                </div>
                <span className="text-primary text-xs font-semibold">{threshold}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipInfo;
