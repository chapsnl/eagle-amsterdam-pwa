import { useQuery } from "@tanstack/react-query";

const WP_API_BASE = "https://www.eagleamsterdam.com/wp-json/wp/v2";

interface WPMediaSize {
  source_url: string;
  width: number;
  height: number;
}

interface WPFeaturedMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    sizes: {
      medium?: WPMediaSize;
      large?: WPMediaSize;
      full?: WPMediaSize;
    };
  };
}

interface WPEvent {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  slug: string;
  date: string;
  featured_media: number;
  event_type: number[];
  _embedded?: {
    "wp:featuredmedia"?: WPFeaturedMedia[];
  };
}

export interface EagleEvent {
  id: number;
  title: string;
  description: string;
  link: string;
  slug: string;
  publishedDate: string;
  imageUrl: string | null;
  imageAlt: string;
  eventTypeIds: number[];
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() || "";
}

function mapEvent(wp: WPEvent): EagleEvent {
  const media = wp._embedded?.["wp:featuredmedia"]?.[0];
  const imageUrl =
    media?.media_details?.sizes?.large?.source_url ||
    media?.source_url ||
    null;

  return {
    id: wp.id,
    title: wp.title.rendered,
    description: stripHtml(wp.content.rendered),
    link: wp.link,
    slug: wp.slug,
    publishedDate: wp.date,
    imageUrl,
    imageAlt: media?.alt_text || wp.title.rendered,
    eventTypeIds: wp.event_type || [],
  };
}

async function fetchEvents(perPage = 20): Promise<EagleEvent[]> {
  const res = await fetch(
    `${WP_API_BASE}/ajde_events?per_page=${perPage}&_embed=wp:featuredmedia`
  );
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  const data: WPEvent[] = await res.json();
  return data.map(mapEvent);
}

export function useEagleEvents(perPage = 20) {
  return useQuery({
    queryKey: ["eagle-events", perPage],
    queryFn: () => fetchEvents(perPage),
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 2,
  });
}
