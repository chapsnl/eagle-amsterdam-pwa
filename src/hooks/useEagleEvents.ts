import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/devMode";
import { getCache, setCache, clearCache } from "@/lib/cache";

const TWENTY_FOUR_HOURS = 86_400_000;
const CACHE_KEY = "eagle-events-cache";
const QUERY_KEY = ["eagle-events"];

export interface EagleEvent {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  imageUrl: string | null;
  thumbUrl: string | null;
  link: string | null;
}

interface FetchResponse {
  success: boolean;
  events: EagleEvent[];
  count: number;
  error?: string;
}

async function fetchEvents(): Promise<EagleEvent[]> {
  const dev = isDevMode();

  if (!dev) {
    const cached = getCache<EagleEvent[]>(CACHE_KEY);
    if (cached) return cached;
  }

  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-events"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch events");

  if (!dev) setCache(CACHE_KEY, data.events);
  return data.events;
}

export function useEagleEvents() {
  const dev = isDevMode();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchEvents,
    staleTime: dev ? 0 : TWENTY_FOUR_HOURS,
    gcTime: dev ? 0 : TWENTY_FOUR_HOURS,
    retry: 2,
  });

  const forceRefresh = useCallback(async () => {
    clearCache(CACHE_KEY);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return { ...query, forceRefresh };
}
