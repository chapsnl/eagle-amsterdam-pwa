import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VoucherCard from "@/components/loyalty/VoucherCard";
import WarningDialog from "@/components/shared/WarningDialog";

interface Voucher {
  id: string;
  title: string;
  description: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const VipMemberDeals = () => {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [warning, setWarning] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) {
      navigate("/vip/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setUserId(parsed.userId);
      loadVouchers(parsed.userId);
    } catch {
      navigate("/vip/login");
    }
  }, [navigate]);

  const loadVouchers = async (uid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("get-member-vouchers", {
        body: { userId: uid },
      });

      if (!error && data?.success) {
        setVouchers(data.vouchers || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (voucher: Voucher) => {
    if (!userId) return;

    const { data, error } = await supabase.functions.invoke("redeem-voucher", {
      body: { userId, voucherId: voucher.id },
    });

    if (error || !data?.success) {
      setWarning({ open: true, title: "Error", message: "Could not redeem voucher. Try again." });
      return;
    }

    // Remove redeemed voucher from the list immediately
    setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
  };

  // Only show unredeemed vouchers
  const activeVouchers = vouchers.filter((v) => !v.redeemed);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-[90%] mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Tag className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl text-foreground tracking-[-0.05em] font-extrabold">MEMBER DEALS</h1>
          <p className="text-muted-foreground text-xs tracking-[-0.02em]">
            Your exclusive vouchers and rewards
          </p>
        </div>

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
