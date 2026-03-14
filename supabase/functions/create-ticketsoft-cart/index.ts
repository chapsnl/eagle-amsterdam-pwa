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

    const body = await req.json();
    const { eventUuid, tickets } = body;

    if (!eventUuid || !tickets?.length) {
      return new Response(
        JSON.stringify({ error: "eventUuid and tickets are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ticketsoft uses apiKey auth: raw token in Authorization header (no Bearer prefix)
    const res = await fetch("https://ticketsoft.nl/api/cart", {
      method: "POST",
      headers: {
        Authorization: token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventUuid, tickets }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Ticketsoft cart error: ${res.status} - ${errorBody}`);
    }

    const cart = await res.json();

    return new Response(JSON.stringify(cart), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
