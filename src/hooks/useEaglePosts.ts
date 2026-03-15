import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/devMode";
import { getCacheWithMeta, setCache, clearCache } from "@/lib/cache";

const TWENTY_FOUR_HOURS = 86_400_000;
const CACHE_KEY = "eagle-posts-cache";
const QUERY_KEY = ["eagle-posts"];

export interface EaglePost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  link: string;
  imageUrl: string | null;
}

interface FetchResponse {
  success: boolean;
  posts: EaglePost[];
  error?: string;
}

/**
 * Always fetches from the API. Cache is used only for placeholderData
 * so the UI is never blank while a background refresh happens.
 */
async function fetchPosts(): Promise<EaglePost[]> {
  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-posts"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch posts");

  if (!isDevMode()) setCache(CACHE_KEY, data.posts);
  return data.posts;
}

export function useEaglePosts() {
  const dev = isDevMode();
  const queryClient = useQueryClient();

  // Provide stale cached data as placeholder so the screen is never blank
  const staleData = (() => {
    if (dev) return undefined;
    const { data } = getCacheWithMeta<EaglePost[]>(CACHE_KEY);
    return data ?? undefined;
  })();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPosts,
    staleTime: dev ? 0 : TWENTY_FOUR_HOURS,
    gcTime: dev ? 0 : TWENTY_FOUR_HOURS,
    retry: 2,
    placeholderData: staleData,
    // Auto-refresh when app regains focus if data is stale (>24h)
    refetchOnWindowFocus: true,
    // Re-check on every mount (page navigation via lazy routes)
    refetchOnMount: true,
  });

  const forceRefresh = useCallback(async () => {
    clearCache(CACHE_KEY);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return { ...query, forceRefresh };
}
