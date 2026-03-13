import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TWENTY_FOUR_HOURS = 86_400_000;
const CACHE_KEY = "eagle-events-cache";

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

function getCachedData(): { data: EagleEvent[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedData(data: EagleEvent[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded */ }
}

async function fetchEvents(): Promise<EagleEvent[]> {
  const cached = getCachedData();
  if (cached && Date.now() - cached.timestamp < TWENTY_FOUR_HOURS) {
    return cached.data;
  }

  const { data, error } = await supabase.functions.invoke<FetchResponse>(
    "fetch-eagle-events"
  );

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch events");

  setCachedData(data.events);
  return data.events;
}

export function useEagleEvents() {
  return useQuery({
    queryKey: ["eagle-events"],
    queryFn: fetchEvents,
    staleTime: TWENTY_FOUR_HOURS,
    gcTime: TWENTY_FOUR_HOURS,
    retry: 2,
  });
}
