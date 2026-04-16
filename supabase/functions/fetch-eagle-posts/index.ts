const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WPPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
}

interface WPMedia {
  source_url?: string;
  media_details?: {
    sizes?: {
      medium_large?: { source_url: string };
      medium?: { source_url: string };
      large?: { source_url: string };
    };
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\[&hellip;\]/g, '…')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickMediaUrl(media: WPMedia | undefined): string | null {
  if (!media) return null;
  const sizes = media.media_details?.sizes;
  return sizes?.medium_large?.source_url
    || sizes?.large?.source_url
    || sizes?.medium?.source_url
    || media.source_url
    || null;
}

/** Fetch ALL media in a single request using ?include=id1,id2,... */
async function fetchMediaBatch(ids: number[]): Promise<Map<number, WPMedia>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();
  try {
    const res = await fetch(
      `https://www.eagleamsterdam.com/wp-json/wp/v2/media?include=${uniqueIds.join(',')}&per_page=${uniqueIds.length}&_fields=id,source_url,media_details`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EaglePWA/1.0)',
          'Accept': 'application/json',
        },
      }
    );
    if (!res.ok) return new Map();
    const items: (WPMedia & { id: number })[] = await res.json();
    const map = new Map<number, WPMedia>();
    for (const m of items) map.set(m.id, m);
    return map;
  } catch {
    return new Map();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = `https://www.eagleamsterdam.com/wp-json/wp/v2/posts?per_page=15&orderby=date&order=desc&_fields=id,title,excerpt,content,date,link,featured_media&v=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EaglePWA/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WordPress API returned ${response.status}`);
    }

    const posts: WPPost[] = await response.json();

    // Fetch all media in ONE batched request (was N sequential calls)
    const mediaMap = await fetchMediaBatch(posts.map(p => p.featured_media));

    const formatted = posts.map((post) => ({
      id: post.id,
      title: stripHtml(post.title.rendered),
      excerpt: stripHtml(post.excerpt.rendered),
      content: post.content.rendered,
      date: post.date,
      link: post.link,
      imageUrl: pickMediaUrl(mediaMap.get(post.featured_media)),
    }));

    return new Response(
      JSON.stringify({ success: true, posts: formatted }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Allow browser/CDN to revalidate every 5 min instead of re-running this function
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
