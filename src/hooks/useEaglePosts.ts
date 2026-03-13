import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/devMode";

const TWENTY_FOUR_HOURS = 86_400_000;
const CACHE_KEY = "eagle-posts-cache";

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

function getCachedData(): { data: EaglePost[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedData(data: EaglePost[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded */ }
}

async function fetchPosts(): Promise<EaglePost[]> {
  const dev = isDevMode();

  if (!dev) {
    const cached = getCachedData();
    if (cached && Date.now() - cached.timestamp < TWENTY_FOUR_HOURS) {
      return cached.data;
    }
  }

  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-posts"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch posts");

  if (!dev) setCachedData(data.posts);
  return data.posts;
}

export function useEaglePosts() {
  const dev = isDevMode();
  return useQuery({
    queryKey: ["eagle-posts"],
    queryFn: fetchPosts,
    staleTime: dev ? 0 : TWENTY_FOUR_HOURS,
    gcTime: dev ? 0 : TWENTY_FOUR_HOURS,
    retry: 2,
  });
}
