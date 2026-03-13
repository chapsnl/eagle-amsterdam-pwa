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

async function fetchMediaUrl(mediaId: number): Promise<string | null> {
  if (!mediaId) return null;
  try {
    const res = await fetch(
      `https://www.eagleamsterdam.com/wp-json/wp/v2/media/${mediaId}?_fields=source_url,media_details`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EaglePWA/1.0)',
          'Accept': 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const media: WPMedia = await res.json();
    const sizes = media.media_details?.sizes;
    return sizes?.medium_large?.source_url
      || sizes?.large?.source_url
      || sizes?.medium?.source_url
      || media.source_url
      || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = 'https://www.eagleamsterdam.com/wp-json/wp/v2/posts?per_page=10&_fields=id,title,excerpt,content,date,link,featured_media';

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

    // Fetch all media URLs in parallel
    const mediaUrls = await Promise.all(
      posts.map(post => fetchMediaUrl(post.featured_media))
    );

    const formatted = posts.map((post, i) => ({
      id: post.id,
      title: stripHtml(post.title.rendered),
      excerpt: stripHtml(post.excerpt.rendered),
      date: post.date,
      link: post.link,
      imageUrl: mediaUrls[i],
    }));

    return new Response(
      JSON.stringify({ success: true, posts: formatted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
