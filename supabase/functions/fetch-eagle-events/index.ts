const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedEvent {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  imageUrl: string | null;
  thumbUrl: string | null;
  link: string | null;
}

function parseEvents(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  
  // Match each event div with data-time attribute
  const eventRegex = /class="eventon_list_event[^"]*"[^>]*data-event_id="(\d+)"[^>]*data-time="(\d+)-(\d+)"[^>]*>([\s\S]*?)(?=<div[^>]*class="eventon_list_event|<\/div>\s*<\/div>\s*<\/div>\s*<div class="evcal_month_line|$)/g;
  
  let match;
  while ((match = eventRegex.exec(html)) !== null) {
    const eventId = match[1];
    const startTime = parseInt(match[2], 10);
    const endTime = parseInt(match[3], 10);
    const eventHtml = match[4];

    // Title
    const titleMatch = eventHtml.match(/itemprop="name"[^>]*>([^<]+)</);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Event';

    // Description
    const descMatch = eventHtml.match(/itemprop="description"[^>]*>([\s\S]*?)<\/div>/);
    let description = '';
    if (descMatch) {
      description = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Image
    const imgMatch = eventHtml.match(/data-img="([^"]+)"/);
    const thumbMatch = eventHtml.match(/data-thumb="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : null;
    const thumbUrl = thumbMatch ? thumbMatch[1] : null;

    // Link
    const linkMatch = eventHtml.match(/itemprop="url"\s+href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : null;

    events.push({
      id: `${eventId}_${startTime}`,
      title,
      description,
      startTime,
      endTime,
      imageUrl,
      thumbUrl,
      link,
    });
  }

  return events;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const agendaUrl = 'https://www.eagleamsterdam.com/event-agenda-eagle-amsterdam';
    
    const response = await fetch(agendaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EaglePWA/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agenda page: ${response.status}`);
    }

    const html = await response.text();
    const events = parseEvents(html);

    // Filter: only future events (end time > now)
    const now = Math.floor(Date.now() / 1000);
    const futureEvents = events.filter(e => e.endTime > now);

    // Sort by start time ascending
    futureEvents.sort((a, b) => a.startTime - b.startTime);

    return new Response(
      JSON.stringify({ success: true, events: futureEvents, count: futureEvents.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
