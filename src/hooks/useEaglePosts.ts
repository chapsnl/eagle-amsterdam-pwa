import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/devMode";
import { getCache, getCacheWithMeta, setCache, clearCache } from "@/lib/cache";

const TWENTY_FOUR_HOURS = 86_400_000;
const ONE_HOUR = 3_600_000;
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

async function fetchPosts(): Promise<EaglePost[]> {
  const dev = isDevMode();

  if (!dev) {
    const cached = getCache<EaglePost[]>(CACHE_KEY);
    if (cached) return cached;
  }

  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-posts"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch posts");

  if (!dev) setCache(CACHE_KEY, data.posts);
  return data.posts;
}

export function useEaglePosts() {
  const dev = isDevMode();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const { data: staleData } = (() => {
    if (dev) return { data: undefined };
    const { data, isStale } = getCacheWithMeta<EaglePost[]>(CACHE_KEY);
    return isStale && data ? { data } : { data: undefined };
  })();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPosts,
    staleTime: dev ? 0 : TWENTY_FOUR_HOURS,
    gcTime: dev ? 0 : TWENTY_FOUR_HOURS,
    retry: 2,
    placeholderData: staleData,
  });

  const forceRefresh = useCallback(async () => {
    clearCache(CACHE_KEY);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    if (dev) return;
    intervalRef.current = setInterval(() => {
      const fresh = getCache<EaglePost[]>(CACHE_KEY);
      if (!fresh) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    }, ONE_HOUR);
    return () => clearInterval(intervalRef.current);
  }, [dev, queryClient]);

  return { ...query, forceRefresh };
}
