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
 * Extract event data using regex from JSON-LD blocks.
 * The JSON-LD from EventON contains malformed HTML inside description values,
 * making JSON.parse unreliable. We extract fields individually via regex.
 */
function parseEventsFromCalendarApi(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Find all JSON-LD blocks by looking for @context markers
  const marker = '"@context"';
  let searchFrom = 0;

  while (true) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) break;

    // Find the enclosing block - go back to find opening {
    let blockStart = idx;
    for (let i = idx - 1; i >= 0; i--) {
      if (html[i] === '{') { blockStart = i; break; }
    }

    // Find balanced closing }
    let depth = 0;
    let blockEnd = -1;
    for (let i = blockStart; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) { blockEnd = i; break; }
      }
    }

    if (blockEnd === -1) {
      searchFrom = idx + marker.length;
      continue;
    }

    const block = html.substring(blockStart, blockEnd + 1);
    searchFrom = blockEnd + 1;

    // Only process Event types
    if (!block.includes('"Event"')) continue;




    // Extract fields via simple regex - no complex escaping needed since
    // the HTML is already JSON-decoded (no escaped quotes in URLs/names)
    const get = (field: string): string | null => {
      const re = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`)
      const m = block.match(re);
      return m ? m[1] : null;
    };

    const name = get('name');
    const startDateRaw = get('startDate');
    const endDateRaw = get('endDate');

    if (!name || !startDateRaw || !endDateRaw) continue;

    // Fix non-standard date format: "2026-3-12T22:00+0:00" → proper ISO
    const fixDate = (d: string): number => {
      // Normalize: pad month/day, fix timezone offset format
      const fixed = d
        .replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_m, y, mo, da) =>
          `${y}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`)
        .replace(/\+(\d):(\d{2})$/, '+0$1:$2')
        .replace(/\+(\d{2}):(\d{2})$/, '+$1:$2');
      const ts = new Date(fixed).getTime();
      return isNaN(ts) ? new Date(d).getTime() : ts;
    };

    const startTime = Math.floor(fixDate(startDateRaw) / 1000);
    const endTime = Math.floor(fixDate(endDateRaw) / 1000);

    if (isNaN(startTime) || isNaN(endTime) || startTime === 0) continue;

    const eventId = get('@id') || `event_${startTime}`;
    const imageUrl = get('image') || null;
    const link = get('url') || null;

    // Keep raw HTML for rich rendering, decode HTML entities
    let desc = get('description') || '';
    desc = desc
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '\u201c')
      .replace(/&#8221;/g, '\u201d')
      .trim();

    events.push({
      id: eventId,
      title: name,
      description: desc,
      startTime,
      endTime,
      startDate: new Date(startTime * 1000).toISOString(),
      endDate: new Date(endTime * 1000).toISOString(),
      imageUrl,
      link,
    });
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
      const url = `https://www.eagleamsterdam.com/wp-json/eventon/calendar?month=${month}&year=${year}&show_et_ft_img=yes&v=${Date.now()}`;
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
      // Debug: log a sample of the HTML to understand structure
      if (month === months[0].month) {
        const imgIdx = html.indexOf('"image"');
        if (imgIdx !== -1) {
          console.log('DEBUG image context:', html.substring(imgIdx, imgIdx + 200));
        } else {
          console.log('DEBUG: no "image" field found in HTML. First 500 chars:', html.substring(0, 500));
        }
      }
      const monthEvents = parseEventsFromCalendarApi(html);
      console.log(`Month ${month}/${year}: found ${monthEvents.length} events, ${monthEvents.filter(e => e.imageUrl).length} with images`);
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
