import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_STORAGE_KEY = "eagle-loyalty-stamps";
const LOCAL_LAST_SCAN_KEY = "last_loyalty_scan";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TOTAL_STAMPS = 10;

export function useLoyaltyStamps() {
  const { user } = useAuth();
  const [stamps, setStamps] = useState(0);
  const [redeemed, setRedeemed] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stamps from DB (and migrate localStorage if needed)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data } = await (supabase as any)
          .from("loyalty_stamps")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setStamps(data.stamps);
          setRedeemed(data.redeemed);
          setLastScanAt(data.last_scan_at);
        } else {
          // Migrate from localStorage
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          const lastScan = localStorage.getItem(LOCAL_LAST_SCAN_KEY);

          let localStamps = 0;
          let localRedeemed = false;

          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              localStamps = parsed.stamps || 0;
              localRedeemed = parsed.redeemed || false;
            } catch { /* ignore parse errors */ }
          }

          const lastScanIso = lastScan
            ? new Date(parseInt(lastScan, 10)).toISOString()
            : null;

          await (supabase as any).from("loyalty_stamps").insert({
            user_id: user.id,
            stamps: localStamps,
            redeemed: localRedeemed,
            last_scan_at: lastScanIso,
          });

          setStamps(localStamps);
          setRedeemed(localRedeemed);
          setLastScanAt(lastScanIso);

          // Clean up localStorage after migration
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          localStorage.removeItem(LOCAL_LAST_SCAN_KEY);
        }
      } catch (err) {
        console.error("Failed to load loyalty stamps:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const addStamp = useCallback(async () => {
    if (!user) return false;

    const newStamps = Math.min(stamps + 1, TOTAL_STAMPS);
    const now = new Date().toISOString();

    const { error } = await (supabase as any)
      .from("loyalty_stamps")
      .update({ stamps: newStamps, last_scan_at: now })
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to add stamp:", error);
      return false;
    }

    setStamps(newStamps);
    setLastScanAt(now);
    return true;
  }, [user, stamps]);

  const resetCard = useCallback(async () => {
    if (!user) return;

    await (supabase as any)
      .from("loyalty_stamps")
      .update({ stamps: 0, redeemed: false, last_scan_at: null })
      .eq("user_id", user.id);

    setStamps(0);
    setRedeemed(false);
    setLastScanAt(null);
  }, [user]);

  const canScan = useCallback(() => {
    if (!lastScanAt) return true;
    return Date.now() - new Date(lastScanAt).getTime() >= SEVEN_DAYS_MS;
  }, [lastScanAt]);

  return { stamps, redeemed, loading, addStamp, resetCard, canScan, totalStamps: TOTAL_STAMPS };
}
