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
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  link: string | null;
}

function parseEventsFromCalendarApi(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Parse JSON-LD schema blocks embedded in the HTML
  // Pattern: {"@context": "http://schema.org","@type": "Event", ...}
  const jsonLdRegex = /\{"@context":\s*"http:\/\/schema\.org","@type":\s*"Event",[^}]+\}/g;
  
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      // Clean up the JSON string - fix escaped HTML entities
      let jsonStr = match[0]
        .replace(/\\n/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\r/g, ' ');

      const schema = JSON.parse(jsonStr);

      const startDate = schema.startDate || '';
      const endDate = schema.endDate || '';
      const startTime = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : 0;
      const endTime = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : 0;

      // Clean description - strip HTML tags
      let desc = schema.description || '';
      desc = desc.replace(/<[^>]+>/g, ' ').replace(/&lt;[^&]*&gt;/g, '').replace(/\s+/g, ' ').trim();

      const eventId = schema['@id'] || `event_${startTime}`;

      events.push({
        id: eventId,
        title: schema.name || 'Untitled Event',
        description: desc,
        startTime,
        endTime,
        startDate,
        endDate,
        imageUrl: schema.image || null,
        link: schema.url || null,
      });
    } catch (e) {
      console.error('Failed to parse event JSON-LD:', e);
    }
  }

  // Also try parsing from data-time attributes + event title spans as fallback
  if (events.length === 0) {
    const eventBlockRegex = /data-event_id="(\d+)"[^>]*data-time="(\d+)-(\d+)"[\s\S]*?evcal_event_title[^>]*>([^<]+)/g;
    let fallbackMatch;
    while ((fallbackMatch = eventBlockRegex.exec(html)) !== null) {
      const startTime = parseInt(fallbackMatch[2], 10);
      const endTime = parseInt(fallbackMatch[3], 10);
      events.push({
        id: `${fallbackMatch[1]}_${startTime}`,
        title: fallbackMatch[4].trim(),
        description: '',
        startTime,
        endTime,
        startDate: new Date(startTime * 1000).toISOString(),
        endDate: new Date(endTime * 1000).toISOString(),
        imageUrl: null,
        link: null,
      });
    }
  }

  return events;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch current month and next 2 months for a fuller agenda
    const now = new Date();
    const months: { month: number; year: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const allEvents: ParsedEvent[] = [];

    for (const { month, year } of months) {
      const url = `https://www.eagleamsterdam.com/wp-json/eventon/calendar?month=${month}&year=${year}`;
      console.log('Fetching:', url);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EaglePWA/1.0)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch month ${month}/${year}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const html = data.html || '';
      const monthEvents = parseEventsFromCalendarApi(html);
      allEvents.push(...monthEvents);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allEvents.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    // Filter: only future events (end time > now)
    const nowUnix = Math.floor(Date.now() / 1000);
    const futureEvents = unique.filter(e => e.endTime > nowUnix);

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
