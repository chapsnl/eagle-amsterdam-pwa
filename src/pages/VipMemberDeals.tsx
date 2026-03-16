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

  // Track loaded voucher IDs and redeem them all when leaving the page
  const viewedVoucherIds = useRef<string[]>([]);
  const viewedUserId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      // On unmount, mark all viewed vouchers as redeemed
      const ids = viewedVoucherIds.current;
      const uid = viewedUserId.current;
      if (ids.length > 0 && uid) {
        ids.forEach((id) => {
          supabase
            .from("member_vouchers")
            .update({ redeemed: true, redeemed_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", uid)
            .then(() => {});
        });
      }
    };
  }, []);

  const loadVouchers = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("member_vouchers")
        .select("*")
        .eq("user_id", uid)
        .eq("redeemed", false)
        .order("created_at", { ascending: false });
      setVouchers(data || []);
      viewedVoucherIds.current = (data || []).map((v) => v.id);
      viewedUserId.current = uid;
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (voucher: Voucher) => {
    if (!userId) return;
    const { error } = await supabase
      .from("member_vouchers")
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq("id", voucher.id)
      .eq("user_id", userId);

    if (error) {
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
