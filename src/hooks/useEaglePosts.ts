import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-posts"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch posts");

  return data.posts;
}

export function useEaglePosts() {
  return useQuery({
    queryKey: ["eagle-posts"],
    queryFn: fetchPosts,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}
