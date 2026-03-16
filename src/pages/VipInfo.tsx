import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Star, Gift, Ticket, Crown, Zap } from "lucide-react";

const INFO_VISITED_KEY = "eagle_vip_info_visited";

const VipInfo = () => {
  const navigate = useNavigate();
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) navigate("/vip/login");

    const visited = localStorage.getItem(INFO_VISITED_KEY);
    if (!visited) {
      setIsFirstVisit(true);
      localStorage.setItem(INFO_VISITED_KEY, "true");
    }
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
            As a VIP member, you save points for <strong className="text-foreground">free access</strong> to major Eagle Amsterdam events such as <strong className="text-foreground">NcAdam</strong>, <strong className="text-foreground">Horsemen & Knights</strong>, and <strong className="text-foreground">Cum Hunks</strong>.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Collect <strong className="text-foreground">9 stamps</strong> to receive one free entry to an Eagle organized event.
          </p>
          {isFirstVisit && (
            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-foreground text-sm font-bold leading-snug">
                Since you've joined, you've received 1 stamp as a gift! Scan your second stamp during an event — only 7 more to go!
              </p>
            </div>
          )}
        </div>

        {/* Member Deals — explaining dashboard buttons */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">Member Deals — Your Dashboard Buttons Explained</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Each button on your VIP Dashboard gives you access to a different perk. Here's what they do:
          </p>
          <ul className="text-muted-foreground text-sm space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <Ticket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Loyalty</strong> — Collect stamps and redeem them for free access to selected events</span>
            </li>
            <li className="flex items-start gap-2">
              <Ticket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Member Pass</strong> — Your digital VIP card with QR code, status level, and fast-track perks</span>
            </li>
            <li className="flex items-start gap-2">
              <Ticket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Info</strong> — This page! Everything about your membership benefits</span>
            </li>
          </ul>
          <p className="text-muted-foreground text-sm leading-relaxed pt-1">
            Vouchers for app users include free event access, a welcome drink on your first visit, and a free wardrobe item.
          </p>
        </div>

        {/* Fast-Track & Priority Access */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">Fast-Track & Priority Access</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your VIP Member Pass gives you <strong className="text-foreground">fast-track and priority entry</strong> during major events — no waiting, guaranteed entry:
          </p>
          <ul className="text-muted-foreground text-sm space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">→</span>
              <span>All Pride events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">→</span>
              <span>Kings Night</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">→</span>
              <span>Other large-scale city events</span>
            </li>
          </ul>
          <p className="text-muted-foreground text-sm leading-relaxed pt-1">
            From <strong className="text-foreground">Cruiser</strong> status and higher, you unlock fast-track access and your <strong className="text-foreground">Member Pass turns green</strong>.
          </p>
        </div>

        {/* VIP Status Levels */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">VIP Status Levels</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your status level increases based on your total stamps earned:
          </p>
          <div className="space-y-3">
            {/* Regular */}
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "hsl(5, 64%, 43%)" }}>
              <p className="text-white text-sm font-bold">Regular</p>
              <p className="text-white/80 text-xs">Starting level — 0+ stamps</p>
              <p className="text-white/70 text-xs mt-1">Your default status. Collect stamps and enjoy basic member perks.</p>
            </div>

            {/* Cruiser */}
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "hsl(145, 50%, 28%)" }}>
              <p className="text-white text-sm font-bold">Cruiser</p>
              <p className="text-white/80 text-xs">27+ stamps or 15 weekly app opens</p>
              <p className="text-white/70 text-xs mt-1">Fast-track & priority access unlocked. Your Member Pass turns green.</p>
            </div>

            {/* Party Boy */}
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "hsl(145, 50%, 28%)" }}>
              <p className="text-white text-sm font-bold">Party Boy</p>
              <p className="text-white/80 text-xs">36+ stamps</p>
              <p className="text-white/70 text-xs mt-1">Dedicated regular. All Cruiser perks plus enhanced priority at all events.</p>
            </div>

            {/* Slut */}
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "hsl(330, 100%, 50%)" }}>
              <p className="text-white text-sm font-bold">Slut</p>
              <p className="text-white/80 text-xs">50+ stamps — Ultimate VIP</p>
              <p className="text-white/70 text-xs mt-1">
                Your Member Pass turns Neon Pink. You get free access during All Pride's and Kings Night, free coat check at all times, and always priority & fast-track access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipInfo;
