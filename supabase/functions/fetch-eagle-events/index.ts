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

/**
 * Extract balanced JSON objects starting with {"@context" from the HTML string.
 * Handles nested braces (location, organizer, etc.)
 */
function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const marker = '{"@context"';
  let searchFrom = 0;

  while (true) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) break;

    let depth = 0;
    let end = -1;
    for (let i = idx; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end !== -1) {
      blocks.push(html.substring(idx, end + 1));
      searchFrom = end + 1;
    } else {
      searchFrom = idx + marker.length;
    }
  }

  return blocks;
}

function parseEventsFromCalendarApi(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = extractJsonLdBlocks(html);

  for (const raw of blocks) {
    try {
      // Clean up escaped sequences and HTML artifacts
      const jsonStr = raw
        .replace(/\\n/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/<br\s*\\?=?\s*"?\s*>/gi, ' ')   // <br \="">
        .replace(/<[^>]+>/g, ' ')                    // strip any remaining HTML tags inside values
        .replace(/&lt;[^&]*?&gt;/g, '')              // strip &lt;...&gt; encoded tags
        .replace(/\\/g, '');                          // remove stray backslashes (escaped /)

      // Re-escape the JSON properly: the API uses \/ which we just stripped
      // But the above is too aggressive – let's be more targeted:
      // Actually, let's re-parse from raw with only safe cleanups
      const safeJson = raw
        .replace(/\\n/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\r/g, ' ');

      let schema: Record<string, unknown>;
      try {
        schema = JSON.parse(safeJson);
      } catch {
        // Try harder: strip HTML from description value before parsing
        // Find "description":"..." and clean its content
        const descCleaned = raw
          .replace(/\\n/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\r/g, ' ')
          // Replace problematic HTML inside string values
          .replace(/<br\s*\\?=?\s*"?\s*>/gi, ' ')
          .replace(/<\/?(?:p|strong|em|br|div|span)[^>]*>/gi, ' ');
        
        try {
          schema = JSON.parse(descCleaned);
        } catch {
          // Last resort: extract fields via regex
          const getName = raw.match(/"name"\s*:\s*"([^"]+)"/);
          const getUrl = raw.match(/"url"\s*:\s*"([^"]+)"/);
          const getImage = raw.match(/"image"\s*:\s*"([^"]+)"/);
          const getStart = raw.match(/"startDate"\s*:\s*"([^"]+)"/);
          const getEnd = raw.match(/"endDate"\s*:\s*"([^"]+)"/);
          const getId = raw.match(/"@id"\s*:\s*"([^"]+)"/);

          if (getName && getStart && getEnd) {
            const startDate = getStart[1].replace(/\\\//g, '/');
            const endDate = getEnd[1].replace(/\\\//g, '/');
            const startTime = Math.floor(new Date(startDate).getTime() / 1000);
            const endTime = Math.floor(new Date(endDate).getTime() / 1000);
            const imageRaw = getImage?.[1]?.replace(/\\\//g, '/') || null;

            events.push({
              id: getId?.[1] || `event_${startTime}`,
              title: getName[1],
              description: '',
              startTime,
              endTime,
              startDate: new Date(startTime * 1000).toISOString(),
              endDate: new Date(endTime * 1000).toISOString(),
              imageUrl: imageRaw,
              link: getUrl?.[1]?.replace(/\\\//g, '/') || null,
            });
          }
          continue;
        }
      }

      const startDateRaw = (schema.startDate as string) || '';
      const endDateRaw = (schema.endDate as string) || '';
      const startTime = startDateRaw ? Math.floor(new Date(startDateRaw).getTime() / 1000) : 0;
      const endTime = endDateRaw ? Math.floor(new Date(endDateRaw).getTime() / 1000) : 0;

      let desc = (schema.description as string) || '';
      desc = desc.replace(/<[^>]+>/g, ' ').replace(/&lt;[^&]*&gt;/g, '').replace(/\s+/g, ' ').trim();

      const eventId = (schema['@id'] as string) || `event_${startTime}`;

      events.push({
        id: eventId,
        title: (schema.name as string) || 'Untitled Event',
        description: desc,
        startTime,
        endTime,
        startDate: startTime ? new Date(startTime * 1000).toISOString() : startDateRaw,
        endDate: endTime ? new Date(endTime * 1000).toISOString() : endDateRaw,
        imageUrl: (schema.image as string) || null,
        link: (schema.url as string) || null,
      });
    } catch (e) {
      console.error('Failed to parse event JSON-LD:', e);
    }
  }

  // Fallback: parse from data attributes if no JSON-LD events found
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
