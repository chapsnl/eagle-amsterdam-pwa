import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Gift, Bell, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VoucherCard from "@/components/loyalty/VoucherCard";
import WarningDialog from "@/components/shared/WarningDialog";
import { useMemberVouchers, type Voucher } from "@/hooks/useMemberVouchers";
import { markSeen } from "@/lib/badgeSeen";

const VipMemberDeals = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [warning, setWarning] = useState({ open: false, title: "", message: "" });
  const [pushStatus, setPushStatus] = useState<"loading" | "granted" | "denied" | "default">("loading");
  const [pushRequesting, setPushRequesting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) {
      navigate("/vip/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setUserId(parsed.userId);
    } catch {
      navigate("/vip/login");
    }
  }, [navigate]);

  useEffect(() => {
    if ("Notification" in window) {
      setPushStatus(Notification.permission as "granted" | "denied" | "default");
    } else {
      setPushStatus("denied");
    }
  }, []);

  // Shared cached fetch — no extra round trip if dashboard already loaded it
  const { data: vouchersData, isLoading, invalidate: invalidateVouchers } = useMemberVouchers();
  const vouchers: Voucher[] = vouchersData || [];
  const loading = isLoading && vouchers.length === 0;

  const handleRedeem = async (voucher: Voucher) => {
    if (!userId) return;

    const { data, error } = await supabase.functions.invoke("redeem-voucher", {
      body: { userId, voucherId: voucher.id },
    });

    if (error || !data?.success) {
      setWarning({ open: true, title: "Error", message: "Could not redeem voucher. Try again." });
      return;
    }

    // Refresh shared cache so dashboard's "active vouchers" badge updates too
    invalidateVouchers();
  };

  const handleEnablePush = async () => {
    setPushRequesting(true);
    try {
      const { requestPushPermission, setOneSignalExternalId } = await import("@/lib/onesignal");
      const granted = await requestPushPermission();
      setPushStatus(granted ? "granted" : "denied");

      if (granted) {
        const stored = localStorage.getItem("vip_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.email) {
            await setOneSignalExternalId(parsed.email);
          }
        }
      }
    } catch {
      setPushStatus("denied");
    } finally {
      setPushRequesting(false);
    }
  };

  const activeVouchers = vouchers.filter((v) => !v.redeemed);
  const showPushCTA = pushStatus === "default";

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-lg mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Tag className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl text-foreground tracking-[-0.05em] font-extrabold">MEMBER DEALS</h1>
          <p className="text-muted-foreground text-xs tracking-[-0.02em]">
            Your exclusive vouchers and rewards
          </p>
        </div>

        {/* Push notification CTA */}
        {showPushCTA && (
          <button
            onClick={handleEnablePush}
            disabled={pushRequesting}
            className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl p-4 transition-colors disabled:opacity-60"
          >
            {pushRequesting ? (
              <RefreshCw className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            ) : (
              <Bell className="w-5 h-5 text-primary flex-shrink-0" />
            )}
            <div className="text-left flex-1">
              <p className="text-foreground text-sm font-bold">Let me know!</p>
              <p className="text-muted-foreground text-xs leading-snug">
                Get notified instantly when you receive a free voucher
              </p>
            </div>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No deals available yet. Check back later!
            </p>
          </div>
        ) : (
          <>
            {activeVouchers.length > 0 && (
              <div className="space-y-6">
                {activeVouchers.map((v) => (
                  <VoucherCard
                    key={v.id}
                    title={v.title}
                    description={v.description}
                    expiresAt={v.expires_at}
                    onRedeem={() => handleRedeem(v)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <WarningDialog
        open={warning.open}
        title={warning.title}
        message={warning.message}
        onClose={() => setWarning({ open: false, title: "", message: "" })}
      />
    </div>
  );
};

export default VipMemberDeals;
