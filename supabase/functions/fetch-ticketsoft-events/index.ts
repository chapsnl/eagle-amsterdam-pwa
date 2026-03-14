import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("TICKETSOFT_ACCESS_TOKEN");
    if (!token) {
      throw new Error("TICKETSOFT_ACCESS_TOKEN not configured");
    }

    console.log("Token length:", token.length, "First 4 chars:", token.substring(0, 4));

    // Try multiple auth methods
    const methods = [
      { url: `https://ticketsoft.nl/api/events?access_token=${encodeURIComponent(token)}`, headers: { Accept: "application/json" } },
      { url: "https://ticketsoft.nl/api/events", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
      { url: "https://ticketsoft.nl/api/events", headers: { Accept: "application/json", "X-Access-Token": token } },
      { url: "https://ticketsoft.nl/api/events", headers: { Accept: "application/json", Authorization: `Token ${token}` } },
    ];

    for (const method of methods) {
      const res = await fetch(method.url, { headers: method.headers });
      const body = await res.text();
      console.log(`Auth method ${JSON.stringify(Object.keys(method.headers))} → ${res.status}: ${body.substring(0, 200)}`);
      
      if (res.ok) {
        return new Response(body, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("All Ticketsoft auth methods failed (401). Please verify your access token.");
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
