import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Voucher {
  id: string;
  title: string;
  description: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const ONE_MINUTE = 60_000;
const TEN_MINUTES = 10 * 60_000;

function getSessionUserId(): string | null {
  try {
    const raw = localStorage.getItem("vip_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.userId ?? null;
  } catch {
    return null;
  }
}

async function fetchVouchers(userId: string): Promise<Voucher[]> {
  const { data, error } = await supabase.functions.invoke("get-member-vouchers", {
    body: { userId },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to load vouchers");
  return (data.vouchers || []) as Voucher[];
}

/**
 * Shared voucher fetcher with 1-minute SWR cache.
 * Invalidate after redeem/dispatch via `invalidate()`.
 */
export function useMemberVouchers() {
  const userId = getSessionUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["member-vouchers", userId],
    queryFn: () => fetchVouchers(userId!),
    enabled: !!userId,
    staleTime: ONE_MINUTE,
    gcTime: TEN_MINUTES,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const invalidate = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: ["member-vouchers", userId] });
  }, [queryClient, userId]);

  return { ...query, invalidate };
}
