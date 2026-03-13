import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-events"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch events");

  return data.events;
}

export function useEagleEvents() {
  return useQuery({
    queryKey: ["eagle-events"],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
