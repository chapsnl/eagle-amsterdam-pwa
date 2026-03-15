import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/devMode";
import { getCache, getCacheWithMeta, setCache, clearCache } from "@/lib/cache";

const TWENTY_FOUR_HOURS = 86_400_000;
const ONE_HOUR = 3_600_000;
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
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Provide stale data as initial/placeholder so the screen is never blank
  const { data: staleData } = (() => {
    if (dev) return { data: undefined };
    const { data, isStale } = getCacheWithMeta<EagleEvent[]>(CACHE_KEY);
    return isStale && data ? { data } : { data: undefined };
  })();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchEvents,
    staleTime: dev ? 0 : TWENTY_FOUR_HOURS,
    gcTime: dev ? 0 : TWENTY_FOUR_HOURS,
    retry: 2,
    placeholderData: staleData,
  });

  const forceRefresh = useCallback(async () => {
    clearCache(CACHE_KEY);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  // Hourly interval check – auto-refresh when cache expires while app is open
  useEffect(() => {
    if (dev) return;
    intervalRef.current = setInterval(() => {
      const fresh = getCache<EagleEvent[]>(CACHE_KEY);
      if (!fresh) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    }, ONE_HOUR);
    return () => clearInterval(intervalRef.current);
  }, [dev, queryClient]);

  return { ...query, forceRefresh };
}
