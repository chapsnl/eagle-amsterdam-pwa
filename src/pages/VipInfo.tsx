import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Star, Gift, ShieldCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPushPermission, setOneSignalExternalId } from "@/lib/onesignal";

const VIP_INFO_SEEN_KEY = "eagle_vip_info_seen";

const VipInfo = () => {
  const navigate = useNavigate();
  const [showBonus, setShowBonus] = useState(false);
  const [pushStatus, setPushStatus] = useState<"granted" | "denied" | "default">("granted");
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPushStatus(Notification.permission as "granted" | "denied" | "default");
    }
  }, []);

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
      <div className="pt-8 px-4 max-w-lg mx-auto w-full space-y-6">
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
          <p className="text-muted-foreground text-[16px] leading-relaxed">
            As a VIP member, you collect tokens for <strong className="text-foreground">free access</strong> to major Eagle Amsterdam events such as <strong className="text-foreground">NcAdam</strong>, <strong className="text-foreground">Horsemen & Knights</strong>, and <strong className="text-foreground">Cum Hunks</strong>.
          </p>
          <p className="text-muted-foreground text-[16px] leading-relaxed">
            Collect <strong className="text-foreground">9 tokens</strong> to receive one free entry to an Eagle organized event.
          </p>
          {showBonus && (
            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-foreground text-[16px] font-bold leading-snug">
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
          <p className="text-muted-foreground text-[16px] leading-relaxed">
            Get automatic vouchers for free cloakroom, drinks, or event entry. Rewards are added every time your status levels up. Plus, we drop surprise vouchers for everyone! Check your Member Deals regularly so you don't miss out!
          </p>
          {pushStatus !== "granted" && (
            <p className="text-foreground text-[16px] leading-relaxed font-bold">
              Turn on Push Notifications when you receive a free voucher!
            </p>
          )}
          {pushStatus === "default" && (
            <Button
              variant="eagle"
              className="w-full mt-2"
              disabled={pushLoading}
              onClick={async () => {
                setPushLoading(true);
                try {
                  const granted = await requestPushPermission();
                  if (granted) {
                    setPushStatus("granted");
                    const sessionRaw = localStorage.getItem("vip_session");
                    if (sessionRaw) {
                      const session = JSON.parse(sessionRaw);
                      if (session.email) {
                        await setOneSignalExternalId(session.email);
                      }
                    }
                  } else {
                    setPushStatus(Notification.permission as any);
                  }
                } catch {}
                setPushLoading(false);
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              {pushLoading ? "Enabling..." : "Turn on now!"}
            </Button>
          )}
        </div>

        {/* Status Levels */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <h2 className="text-foreground text-base font-bold">VIP Status Levels</h2>
          </div>
          <p className="text-muted-foreground text-[16px] leading-relaxed">
            Your status level increases based on your total tokens earned:
          </p>
          <div className="space-y-2">
            {/* Regular */}
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ backgroundColor: "#b43227" }}>
              <div>
                <p className="text-white text-[16px] font-bold">Regular</p>
                <p className="text-white/70 text-xs">Starting level</p>
              </div>
              <span className="text-white text-xs font-semibold">1–9 tokens</span>
            </div>

            {/* Party Boy — green, 10-24 */}
            <div className="flex flex-col rounded-lg px-4 py-3" style={{ backgroundColor: "#1a5c2a" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-[16px] font-bold">Party Boy</p>
                  <p className="text-white/70 text-xs">Active member</p>
                </div>
                <span className="text-white text-xs font-semibold">10–24 tokens</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
                <p className="text-white/80 text-[16px] leading-relaxed">
                  Priority access. Your Member Pass gets <strong className="text-white">Green</strong>.
                </p>
              </div>
            </div>

            {/* Cruiser — blue, 25-49 */}
            <div className="flex flex-col rounded-lg px-4 py-3" style={{ backgroundColor: "#1a3a6b" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-[16px] font-bold">Cruiser</p>
                  <p className="text-white/70 text-xs">Dedicated regular</p>
                </div>
                <span className="text-white text-xs font-semibold">25–49 tokens</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
                <p className="text-white/80 text-[16px] leading-relaxed">
                  Free access*, Fast-Lane access, Always access even when we are full. Your Member Pass gets <strong className="text-white">Blue</strong>.
                </p>
              </div>
            </div>

            {/* Slut */}
            <div className="flex flex-col rounded-lg px-4 py-3" style={{ backgroundColor: "#333333", border: "3px solid #b43227" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-[16px] font-bold">Slut</p>
                  <p className="text-white/70 text-xs">Ultimate VIP</p>
                </div>
                <span className="text-white text-xs font-semibold">50+ tokens</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
                <p className="text-white/80 text-[16px] leading-relaxed">
                  Free access*, Priority access, Fast-Lane access, Always access even if we are full, Free Coat Check (1 Item). Your Member Pass gets <strong className="text-white">Grey/Red</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-muted-foreground text-xs italic leading-relaxed mt-3">
            *Free Entry is limited to Pride, Kings Weekend and other city-wide events. VIP Members must always show their digital Member Pass on their phone to verify status and skip the standard entry requirements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VipInfo;
