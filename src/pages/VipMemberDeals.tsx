import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Gift, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (!stored) {
      navigate("/vip/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      loadVouchers(parsed.userId);
    } catch {
      navigate("/vip/login");
    }
  }, [navigate]);

  const loadVouchers = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("member_vouchers")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setVouchers(data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const activeVouchers = vouchers.filter((v) => !v.redeemed);
  const redeemedVouchers = vouchers.filter((v) => v.redeemed);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="pt-8 px-4 max-w-[90%] mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Tag className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl text-foreground">MEMBER DEALS</h1>
          <p className="text-muted-foreground text-xs">
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
            {/* Active vouchers */}
            {activeVouchers.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-foreground text-sm font-bold">Available</h2>
                {activeVouchers.map((v) => (
                  <div
                    key={v.id}
                    className="bg-card border border-primary/30 rounded-xl p-4 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-foreground text-sm font-bold">{v.title}</p>
                    </div>
                    {v.description && (
                      <p className="text-muted-foreground text-xs leading-relaxed pl-6">
                        {v.description}
                      </p>
                    )}
                    {v.expires_at && (
                      <p className="text-muted-foreground/60 text-[10px] pl-6">
                        Expires: {new Date(v.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Redeemed vouchers */}
            {redeemedVouchers.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-muted-foreground text-sm font-bold">Redeemed</h2>
                {redeemedVouchers.map((v) => (
                  <div
                    key={v.id}
                    className="bg-card border border-border rounded-xl p-4 opacity-50 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-muted-foreground text-sm font-bold line-through">
                        {v.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VipMemberDeals;
