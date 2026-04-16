import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  member_number: string | null;
  profile_image_url: string | null;
  created_at: string;
  name: string;
  email: string;
  total_stamps_earned: number;
  vip_status: string;
  current_stamps: number;
  current_redeemed: boolean;
}

const FIVE_MINUTES = 5 * 60_000;
const ONE_HOUR = 60 * 60_000;

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

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.functions.invoke("get-profile", {
    body: { userId },
  });
  if (error) throw new Error(error.message);
  if (!data?.success || !data.profile) throw new Error(data?.error || "Failed to load profile");
  return data.profile as Profile;
}

/**
 * Shared profile fetcher with 5-minute SWR cache.
 * All call sites within ~5 min reuse the same response — no duplicate edge calls.
 */
export function useProfile() {
  const userId = getSessionUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: FIVE_MINUTES,
    gcTime: ONE_HOUR,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  }, [queryClient, userId]);

  return { ...query, refresh };
}
