import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user already has a welcome voucher (prevent duplicates)
    const { data: existing } = await supabase
      .from("member_vouchers")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "FREE COAT CHECK")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Welcome voucher already granted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.from("member_vouchers").insert({
      user_id: userId,
      title: "FREE HOT SHOT",
      description: "Enjoy a complimentary Hot Shot at the bar. Welcome to the club!",
    });

    if (error) {
      console.error("[grant-welcome-voucher] Insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Grant 1 free loyalty token for sign-up
    const { data: existingStamps } = await supabase
      .from("loyalty_stamps")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingStamps || existingStamps.length === 0) {
      const { error: stampError } = await supabase.from("loyalty_stamps").insert({
        user_id: userId,
        stamps: 1,
      });
      if (stampError) {
        console.error("[grant-welcome-voucher] Stamp insert error:", stampError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[grant-welcome-voucher] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
